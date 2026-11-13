import { addDays, diffDays, isoWeekday, type IsoDate } from "@/lib/dates";
import {
  EXERCISE_DOMAINS,
  type CompetencyStatus,
  type Domain,
  type ExerciseDomain,
  type PracticeResult,
  type Tier,
} from "@/lib/domain/domains";
import { bpmProgress } from "@/features/practice/domain/bpm";

/**
 * Planner déterministe : mêmes entrées → même plan (docs/PRODUCT.md §6).
 * Fonction pure, sans dépendance à React, Next.js ou Supabase.
 */
export const PLANNER_VERSION = "1.0.0";

/** Une tâche « à retravailler » ne revient pas avant ce nombre de jours. */
export const RETRY_SPACING_DAYS = 2;

export type ChallengeLevel = "gentle" | "balanced" | "ambitious";

export interface PlannerSettings {
  weekdayMinutes: number;
  weekendMinutes: number;
  /** Jours ISO pratiqués : 1 = lundi … 7 = dimanche. */
  practiceDays: readonly number[];
  /** 0 = moins, 1 = normal, 2 = plus. */
  domainPreferences: Partial<Record<ExerciseDomain, number>>;
  /** Niveau auto-évalué par domaine (1 à 3). */
  levels: Partial<Record<ExerciseDomain, number>>;
  challengeLevel: ChallengeLevel;
}

export interface PlannerExercise {
  id: string;
  slug: string;
  domain: ExerciseDomain;
  level: number;
  bpmTarget: number | null;
  bpmIncrement: number;
  competencyIds: readonly string[];
}

export interface PlannerPiece {
  id: string;
  title: string;
  tier: Tier;
  currentStep: string;
}

/** Résultat réellement enregistré. Les tâches planifiées non faites n'existent pas ici : pas de dette. */
export interface PlannerLog {
  exerciseId: string | null;
  pieceId: string | null;
  date: IsoDate;
  result: PracticeResult;
  bpm: number | null;
}

export interface PlannerInput {
  /** Lundi de la semaine à planifier. */
  weekStart: IsoDate;
  /** Ne rien générer avant cette date (le passé n'est jamais replanifié). */
  fromDate: IsoDate;
  settings: PlannerSettings;
  exercises: readonly PlannerExercise[];
  competencies: Readonly<Record<string, { name: string; status: CompetencyStatus }>>;
  activePieces: readonly PlannerPiece[];
  /** Historique en ordre chronologique. */
  logs: readonly PlannerLog[];
  /** Jours à ne pas toucher : modifiés à la main ou déjà commencés. */
  lockedDates: readonly IsoDate[];
}

export interface DraftTask {
  date: IsoDate;
  position: number;
  domain: Domain;
  exerciseId: string | null;
  pieceId: string | null;
  plannedMinutes: number;
  targetBpm: number | null;
  reason: string;
}

function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

export function minutesForDate(date: IsoDate, settings: PlannerSettings): number {
  const day = isoWeekday(date);
  if (!settings.practiceDays.includes(day)) return 0;
  return day >= 6 ? settings.weekendMinutes : settings.weekdayMinutes;
}

/**
 * Répartit la durée du jour : ~40 % de répertoire s'il y a une pièce en cours,
 * le reste en 1 à 4 créneaux d'exercices. Le total est toujours égal à `minutes`.
 */
export function allocateDay(minutes: number, hasRepertoire: boolean): { exerciseSlots: number[]; repertoire: number } {
  if (minutes <= 0) return { exerciseSlots: [], repertoire: 0 };
  let repertoire = hasRepertoire && minutes >= 10 ? Math.max(5, roundTo5(minutes * 0.4)) : 0;
  let remaining = minutes - repertoire;
  const slotLength = minutes >= 40 ? Math.max(5, roundTo5(remaining / 4)) : 5;
  const exerciseSlots: number[] = [];
  while (remaining >= slotLength && exerciseSlots.length < 4) {
    exerciseSlots.push(slotLength);
    remaining -= slotLength;
  }
  if (remaining > 0) {
    if (exerciseSlots.length < 4 && remaining >= 5) exerciseSlots.push(remaining);
    else if (repertoire > 0) repertoire += remaining;
    else if (exerciseSlots.length > 0) exerciseSlots[exerciseSlots.length - 1] += remaining;
    else exerciseSlots.push(remaining);
  }
  return { exerciseSlots, repertoire };
}

/** Rotation pondérée des domaines : chaque domaine apparaît au moins une fois par tour. */
export function domainRotation(preferences: PlannerSettings["domainPreferences"]): ExerciseDomain[] {
  const rotation: ExerciseDomain[] = [];
  for (let round = 0; round < 3; round += 1) {
    for (const domain of EXERCISE_DOMAINS) {
      const weight = Math.min(2, Math.max(0, preferences[domain] ?? 1)) + 1;
      if (weight > round) rotation.push(domain);
    }
  }
  return rotation;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

interface Scored {
  exercise: PlannerExercise;
  score: number;
  reason: string;
}

function scoreExercise(
  exercise: PlannerExercise,
  date: IsoDate,
  input: PlannerInput,
  userLevel: number,
): Scored {
  const history = input.logs.filter((l) => l.exerciseId === exercise.id && l.date < date);
  const last = history[history.length - 1];
  const learning = exercise.competencyIds
    .map((id) => input.competencies[id])
    .find((c) => c?.status === "learning");

  if (!last) {
    const base = input.settings.challengeLevel === "gentle" ? 30 : 50;
    return {
      exercise,
      score: base - Math.abs(userLevel - exercise.level) * 3 + (learning ? 5 : 0),
      reason: "nouvel exercice à ton niveau",
    };
  }

  const since = diffDays(date, last.date);
  if (last.result === "retry") {
    let failed = 0;
    for (let i = history.length - 1; i >= 0 && history[i].result === "retry"; i -= 1) failed += 1;
    return {
      exercise,
      // Trop tôt : on laisse reposer plutôt que de répéter mécaniquement chaque jour.
      score: since >= RETRY_SPACING_DAYS ? 100 + failed : -50,
      reason: `à revoir après ${plural(failed, "séance non validée", "séances non validées")}`,
    };
  }
  if (since < RETRY_SPACING_DAYS) {
    return { exercise, score: -40, reason: "entretien" };
  }
  if (learning) {
    return { exercise, score: 60 + Math.min(20, since), reason: `consolide « ${learning.name} », en cours` };
  }
  return {
    exercise,
    score: Math.min(40, since),
    reason: `entretien : pas joué depuis ${plural(since, "jour", "jours")}`,
  };
}

const TIER_ORDER: Record<Tier, number> = { growth: 0, comfort: 1, challenge: 2 };

export function buildPlan(input: PlannerInput): DraftTask[] {
  const { settings } = input;
  const rotation = domainRotation(settings.domainPreferences);
  const locked = new Set(input.lockedDates);
  const pieces = [...input.activePieces].sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.title.localeCompare(b.title, "fr") || a.id.localeCompare(b.id),
  );
  const uses = new Map<string, number>();
  const replanned = new Set<string>();
  const tasks: DraftTask[] = [];
  let cursor = 0;
  let pieceCursor = 0;

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(input.weekStart, i);
    const minutes = minutesForDate(date, settings);
    if (minutes === 0) continue;

    // Les pièces « challenge » attendent une séance longue, sauf si ce sont les seules.
    const eligible = minutes >= 40 ? pieces : pieces.filter((p) => p.tier !== "challenge");
    const dayPieces = eligible.length > 0 ? eligible : pieces;
    const { exerciseSlots, repertoire } = allocateDay(minutes, dayPieces.length > 0);

    // La rotation avance même pour les jours non générés : le plan reste stable
    // quelle que soit la date de (re)génération.
    const dayDomains: ExerciseDomain[] = [];
    let guard = 0;
    while (dayDomains.length < exerciseSlots.length && guard < rotation.length * 2) {
      const domain = rotation[cursor % rotation.length];
      cursor += 1;
      guard += 1;
      if (!dayDomains.includes(domain)) dayDomains.push(domain);
    }
    const piece = repertoire > 0 ? dayPieces[pieceCursor % dayPieces.length] : null;
    if (piece) pieceCursor += 1;

    const generate = date >= input.fromDate && !locked.has(date);
    dayDomains.sort((a, b) => EXERCISE_DOMAINS.indexOf(a) - EXERCISE_DOMAINS.indexOf(b));

    let position = 1;
    dayDomains.forEach((domain, slot) => {
      const userLevel = Math.min(5, Math.max(1, settings.levels[domain] ?? 1));
      const maxLevel = userLevel + (settings.challengeLevel === "ambitious" ? 1 : 0);
      const inDomain = input.exercises.filter((e) => e.domain === domain);
      const atLevel = inDomain.filter((e) => e.level <= maxLevel);
      const pool = atLevel.length > 0 ? atLevel : inDomain;
      const scored = pool.map((e) => scoreExercise(e, date, input, userLevel));
      // Rotation : on prend d'abord les exercices les moins utilisés cette semaine, pour ne pas
      // reproposer le même tant que les autres n'ont pas été joués. Seule exception : un
      // « à revoir » arrivé à échéance revient une fois, même s'il a déjà été joué.
      const useCount = (s: Scored) => uses.get(s.exercise.id) ?? 0;
      const leastUsed = Math.min(...scored.map(useCount));
      const candidates = scored
        .filter((s) => useCount(s) === leastUsed || (s.score >= 100 && !replanned.has(s.exercise.id)))
        .sort((a, b) => b.score - a.score || a.exercise.slug.localeCompare(b.exercise.slug));
      const pick = candidates[0];
      if (!pick) return;
      if (useCount(pick) > 0 && pick.score >= 100) replanned.add(pick.exercise.id);
      uses.set(pick.exercise.id, useCount(pick) + 1);
      if (!generate) return;

      const bpm = bpmProgress(
        pick.exercise.bpmTarget,
        pick.exercise.bpmIncrement,
        input.logs.filter((l) => l.exerciseId === pick.exercise.id && l.date < date),
      );
      const reason = bpm.justRaised
        ? `${pick.reason} · +${pick.exercise.bpmIncrement} BPM après 3 réussites`
        : pick.reason;
      tasks.push({
        date,
        position: position++,
        domain,
        exerciseId: pick.exercise.id,
        pieceId: null,
        plannedMinutes: exerciseSlots[slot],
        targetBpm: bpm.target,
        reason,
      });
    });

    if (piece && generate) {
      const history = input.logs.filter((l) => l.pieceId === piece.id && l.date < date);
      const last = history[history.length - 1];
      const step = piece.currentStep.trim();
      const base = last?.result === "retry" ? "à retravailler la dernière fois" : "pièce en cours";
      tasks.push({
        date,
        position,
        domain: "repertoire",
        exerciseId: null,
        pieceId: piece.id,
        plannedMinutes: repertoire,
        targetBpm: null,
        reason: step ? `${base} — ${step}` : base,
      });
    }
  }
  return tasks;
}
