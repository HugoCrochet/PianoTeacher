import { addDays, formatMinutes, type IsoDate } from "@/lib/dates";
import type { PracticeResult } from "@/lib/domain/domains";
import { competencyStatus, type CompetencyLog } from "@/features/curriculum/domain/competency-status";
import { passageStatus, type PassageLog } from "@/features/repertoire/domain/passages";

/**
 * Records et jalons, calculés uniquement à partir des résultats réels (ordre chronologique).
 * Fonction pure.
 */

export interface MilestoneLog {
  date: IsoDate;
  minutes: number;
  result: PracticeResult;
  key: string | null;
  exerciseId: string | null;
  pieceId: string | null;
  passageId: string | null;
  bpm: number | null;
}

export interface MilestonePiece {
  id: string;
  title: string;
  passageIds: readonly string[];
  /** Date à laquelle le morceau a été marqué « Terminé », sinon null. */
  completedOn: IsoDate | null;
}

export interface MilestoneCompetency {
  name: string;
  exerciseIds: readonly string[];
}

export interface Milestone {
  /** Identifiant stable (pour les listes). */
  id: string;
  label: string;
  date: IsoDate;
}

export interface Record_ {
  label: string;
  value: string;
  date: IsoDate;
}

export interface NextMilestone {
  label: string;
  remaining: string;
}

export interface MilestoneReport {
  achieved: Milestone[];
  records: Record_[];
  next: NextMilestone[];
}

export const SESSION_STEPS = [10, 25, 50, 100, 200, 365] as const;
export const HOUR_STEPS = [5, 10, 25, 50, 100, 250] as const;
export const KEY_INSTALLED_SUCCESSES = 3;

export function longestStreak(dates: readonly IsoDate[]): { days: number; end: IsoDate | null } {
  const sorted = [...new Set(dates)].sort();
  let best = { days: 0, end: null as IsoDate | null };
  let run = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    run = i > 0 && addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > best.days) best = { days: run, end: sorted[i] };
  }
  return best;
}

export function milestones(
  logs: readonly MilestoneLog[],
  pieces: readonly MilestonePiece[] = [],
  competencies: readonly MilestoneCompetency[] = [],
): MilestoneReport {
  const achieved: Milestone[] = [];
  const records: Record_[] = [];
  const next: NextMilestone[] = [];
  if (logs.length === 0) {
    return { achieved, records, next: [{ label: "Première séance", remaining: "une séance, même courte" }] };
  }

  achieved.push({ id: "first", label: "Première séance enregistrée", date: logs[0].date });

  // Séances (jours de pratique) et heures cumulées : date à laquelle chaque palier est franchi.
  const days = new Set<IsoDate>();
  let minutes = 0;
  const sessionDone = new Set<number>();
  const hourDone = new Set<number>();
  for (const log of logs) {
    days.add(log.date);
    minutes += log.minutes;
    for (const step of SESSION_STEPS) {
      if (!sessionDone.has(step) && days.size >= step) {
        sessionDone.add(step);
        achieved.push({ id: `sessions-${step}`, label: `${step} jours de pratique`, date: log.date });
      }
    }
    for (const step of HOUR_STEPS) {
      if (!hourDone.has(step) && minutes >= step * 60) {
        hourDone.add(step);
        achieved.push({ id: `hours-${step}`, label: `${step} heures de pratique au total`, date: log.date });
      }
    }
  }
  const nextSessions = SESSION_STEPS.find((s) => !sessionDone.has(s));
  if (nextSessions) {
    const left = nextSessions - days.size;
    next.push({ label: `${nextSessions} jours de pratique`, remaining: `encore ${left} jour${left > 1 ? "s" : ""}` });
  }
  const nextHours = HOUR_STEPS.find((s) => !hourDone.has(s));
  if (nextHours) next.push({ label: `${nextHours} heures de pratique`, remaining: `encore ${formatMinutes(nextHours * 60 - minutes)}` });

  // Tonalités installées : date de la 3e réussite.
  const keySuccesses = new Map<string, number>();
  for (const log of logs) {
    if (!log.key || log.result !== "success") continue;
    const n = (keySuccesses.get(log.key) ?? 0) + 1;
    keySuccesses.set(log.key, n);
    if (n === KEY_INSTALLED_SUCCESSES) achieved.push({ id: `key-${log.key}`, label: `Tonalité installée : ${log.key}`, date: log.date });
  }

  // Morceaux : tous les passages solides (joué en entier), ou marqué « Terminé ».
  for (const piece of pieces) {
    if (piece.passageIds.length > 0) {
      const byPassage = new Map<string, PassageLog[]>();
      for (const log of logs) {
        if (log.pieceId !== piece.id || !log.passageId || !piece.passageIds.includes(log.passageId)) continue;
        byPassage.set(log.passageId, [
          ...(byPassage.get(log.passageId) ?? []),
          { passageId: log.passageId, date: log.date, result: log.result, bpm: log.bpm },
        ]);
        if (piece.passageIds.every((id) => passageStatus(byPassage.get(id) ?? []) === "solid")) {
          achieved.push({ id: `piece-solid-${piece.id}`, label: `Tous les passages solides : ${piece.title}`, date: log.date });
          break;
        }
      }
    }
    if (piece.completedOn) achieved.push({ id: `piece-done-${piece.id}`, label: `Morceau terminé : ${piece.title}`, date: piece.completedOn });
  }

  // Compétences : premier jour où le statut (même règle que le parcours) devient « Acquise ».
  for (const c of competencies) {
    const history: CompetencyLog[] = [];
    for (const log of logs) {
      if (!log.exerciseId || !c.exerciseIds.includes(log.exerciseId)) continue;
      history.push({ result: log.result, date: log.date });
      if (competencyStatus(history) === "acquired") {
        achieved.push({ id: `competency-${c.name}`, label: `Compétence acquise : ${c.name}`, date: log.date });
        break;
      }
    }
  }

  // Records.
  const streak = longestStreak([...days]);
  if (streak.days >= 2 && streak.end) records.push({ label: "Plus longue série", value: `${streak.days} jours d’affilée`, date: streak.end });
  const perDay = new Map<IsoDate, number>();
  for (const log of logs) perDay.set(log.date, (perDay.get(log.date) ?? 0) + log.minutes);
  let longest: [IsoDate, number] = [logs[0].date, 0];
  for (const [date, m] of perDay) if (m > longest[1]) longest = [date, m];
  records.push({ label: "Plus longue séance", value: formatMinutes(longest[1]), date: longest[0] });

  achieved.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return { achieved, records, next };
}
