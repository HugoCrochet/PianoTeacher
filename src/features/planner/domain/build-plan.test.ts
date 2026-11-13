import { describe, expect, it } from "vitest";
import { addDays, weekDates } from "@/lib/dates";
import { EXERCISE_DOMAINS, type ExerciseDomain } from "@/lib/domain/domains";
import {
  allocateDay,
  buildPlan,
  domainRotation,
  type PlannerExercise,
  type PlannerInput,
  type PlannerLog,
} from "./build-plan";

const WEEK = "2026-11-09"; // lundi

function exercise(domain: ExerciseDomain, n: number, extra: Partial<PlannerExercise> = {}): PlannerExercise {
  return {
    id: `${domain}-${n}`,
    slug: `${domain}-${n}`,
    domain,
    level: 1,
    bpmTarget: 60,
    bpmIncrement: 4,
    competencyIds: [],
    ...extra,
  };
}

const exercises = EXERCISE_DOMAINS.flatMap((d) => [1, 2, 3, 4, 5, 6].map((n) => exercise(d, n)));

function input(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    weekStart: WEEK,
    fromDate: WEEK,
    settings: {
      weekdayMinutes: 25,
      weekendMinutes: 60,
      practiceDays: [1, 2, 3, 4, 5, 6, 7],
      domainPreferences: {},
      levels: { technique: 1, scales_harmony: 1, reading_rhythm: 1, improvisation: 1 },
      challengeLevel: "balanced",
    },
    exercises,
    competencies: {},
    activePieces: [{ id: "piece-1", title: "Prélude", tier: "growth", currentStep: "mesures 9 à 16" }],
    logs: [],
    lockedDates: [],
    ...overrides,
  };
}

function minutesOn(tasks: ReturnType<typeof buildPlan>, date: string): number {
  return tasks.filter((t) => t.date === date).reduce((s, t) => s + t.plannedMinutes, 0);
}

describe("allocateDay", () => {
  it("donne la séance type de 25 minutes : 3 × 5 min + 10 min de répertoire", () => {
    expect(allocateDay(25, true)).toEqual({ exerciseSlots: [5, 5, 5], repertoire: 10 });
  });

  it("ne dépasse ni ne réduit jamais la durée demandée", () => {
    for (let minutes = 5; minutes <= 180; minutes += 1) {
      for (const rep of [true, false]) {
        const { exerciseSlots, repertoire } = allocateDay(minutes, rep);
        expect(exerciseSlots.reduce((s, m) => s + m, 0) + repertoire).toBe(minutes);
        expect(exerciseSlots.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it("redistribue le temps aux exercices quand il n'y a pas de pièce en cours", () => {
    expect(allocateDay(25, false).repertoire).toBe(0);
  });
});

describe("domainRotation", () => {
  it("garde chaque domaine au moins une fois, même avec une préférence « moins »", () => {
    const rotation = domainRotation({ improvisation: 0, technique: 2 });
    for (const d of EXERCISE_DOMAINS) expect(rotation).toContain(d);
    expect(rotation.filter((d) => d === "technique").length).toBeGreaterThan(
      rotation.filter((d) => d === "improvisation").length,
    );
  });
});

describe("buildPlan", () => {
  it("est déterministe", () => {
    expect(buildPlan(input())).toEqual(buildPlan(input()));
  });

  it("respecte la durée de chaque jour (25 min en semaine, 60 min le week-end)", () => {
    const tasks = buildPlan(input());
    const dates = weekDates(WEEK);
    dates.slice(0, 5).forEach((d) => expect(minutesOn(tasks, d)).toBe(25));
    dates.slice(5).forEach((d) => expect(minutesOn(tasks, d)).toBe(60));
  });

  it("ne planifie rien les jours sans pratique", () => {
    const tasks = buildPlan(input({ settings: { ...input().settings, practiceDays: [1, 3, 6] } }));
    expect(new Set(tasks.map((t) => t.date))).toEqual(new Set([WEEK, addDays(WEEK, 2), addDays(WEEK, 5)]));
  });

  it("couvre les 5 domaines sur la semaine", () => {
    const domains = new Set(buildPlan(input()).map((t) => t.domain));
    expect(domains).toEqual(new Set([...EXERCISE_DOMAINS, "repertoire"]));
  });

  it("couvre les 5 domaines même avec seulement trois jours de 25 minutes", () => {
    const tasks = buildPlan(input({ settings: { ...input().settings, practiceDays: [1, 3, 5] } }));
    expect(new Set(tasks.map((t) => t.domain)).size).toBe(5);
  });

  it("garde du répertoire dans chaque séance quand une pièce est en cours", () => {
    const tasks = buildPlan(input());
    for (const d of weekDates(WEEK)) {
      expect(tasks.filter((t) => t.date === d && t.domain === "repertoire")).toHaveLength(1);
    }
  });

  it("fonctionne sans historique ni pièce en cours", () => {
    const tasks = buildPlan(input({ activePieces: [] }));
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.domain !== "repertoire")).toBe(true);
    expect(minutesOn(tasks, WEEK)).toBe(25);
  });

  it("donne une raison lisible à chaque tâche", () => {
    for (const t of buildPlan(input())) expect(t.reason.length).toBeGreaterThan(5);
  });

  it("ne répète pas un exercice dans la semaine quand le catalogue le permet", () => {
    const ids = buildPlan(input()).flatMap((t) => (t.exerciseId ? [t.exerciseId] : []));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fait tourner les exercices d'un petit domaine au lieu de reproposer toujours le même", () => {
    const small = [1, 2, 3].map((n) => exercise("technique", n));
    const tasks = buildPlan(input({ exercises: [...small, ...exercises.filter((e) => e.domain !== "technique")] }));
    const technique = tasks.filter((t) => t.domain === "technique").map((t) => t.exerciseId);
    expect(technique.length).toBeGreaterThan(3);
    const counts = small.map((e) => technique.filter((id) => id === e.id).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    technique.forEach((id, i) => {
      if (i > 0) expect(id).not.toBe(technique[i - 1]);
    });
  });

  it("ne replanifie jamais le passé", () => {
    const from = addDays(WEEK, 3);
    expect(buildPlan(input({ fromDate: from })).every((t) => t.date >= from)).toBe(true);
  });

  it("produit le même plan pour les jours restants, quelle que soit la date de génération", () => {
    const from = addDays(WEEK, 3);
    const full = buildPlan(input()).filter((t) => t.date >= from);
    expect(buildPlan(input({ fromDate: from }))).toEqual(full);
  });

  it("ne touche pas aux jours verrouillés (modifiés à la main ou commencés)", () => {
    const lockedDate = addDays(WEEK, 2);
    const tasks = buildPlan(input({ lockedDates: [lockedDate] }));
    expect(tasks.some((t) => t.date === lockedDate)).toBe(false);
    expect(minutesOn(tasks, addDays(WEEK, 3))).toBe(25);
  });

  it("n'accumule aucune dette : une séance manquée ne rallonge pas les suivantes", () => {
    // Lundi et mardi planifiés mais non pratiqués : aucun log. On regénère mercredi.
    const from = addDays(WEEK, 2);
    const tasks = buildPlan(input({ fromDate: from }));
    expect(minutesOn(tasks, from)).toBe(25);
    expect(tasks.filter((t) => t.date === from).length).toBe(4);
  });

  describe("tâche « à retravailler »", () => {
    const failed = "technique-1";
    const retryLog: PlannerLog = { exerciseId: failed, pieceId: null, date: WEEK, result: "retry", bpm: null };

    it("ne revient pas dès le lendemain", () => {
      const tasks = buildPlan(input({ fromDate: addDays(WEEK, 1), logs: [retryLog] }));
      expect(tasks.filter((t) => t.date === addDays(WEEK, 1)).some((t) => t.exerciseId === failed)).toBe(false);
    });

    it("revient dans une séance ultérieure, une seule fois, avec sa raison", () => {
      const tasks = buildPlan(input({ fromDate: addDays(WEEK, 1), logs: [retryLog] }));
      const again = tasks.filter((t) => t.exerciseId === failed);
      expect(again).toHaveLength(1);
      expect(again[0].date >= addDays(WEEK, 2)).toBe(true);
      expect(again[0].reason).toBe("à revoir après 1 séance non validée");
    });

    it("compte les séances non validées consécutives", () => {
      const logs: PlannerLog[] = [
        { ...retryLog, date: addDays(WEEK, -5) },
        { ...retryLog, date: addDays(WEEK, -3) },
      ];
      const tasks = buildPlan(input({ logs }));
      expect(tasks.find((t) => t.exerciseId === failed)?.reason).toBe("à revoir après 2 séances non validées");
    });
  });

  describe("progression BPM", () => {
    const id = "technique-1";
    const ok = (date: string, bpm: number | null = 60): PlannerLog => ({
      exerciseId: id,
      pieceId: null,
      date,
      result: "success",
      bpm,
    });
    const only = [exercise("technique", 1), ...exercises.filter((e) => e.domain !== "technique")];

    it("n'augmente pas la cible après une seule réussite", () => {
      const tasks = buildPlan(input({ exercises: only, logs: [ok(addDays(WEEK, -3))] }));
      expect(tasks.find((t) => t.exerciseId === id)?.targetBpm).toBe(60);
    });

    it("augmente de l'incrément après 3 réussites consécutives et l'explique", () => {
      const logs = [ok(addDays(WEEK, -9)), ok(addDays(WEEK, -6)), ok(addDays(WEEK, -3))];
      const task = buildPlan(input({ exercises: only, logs })).find((t) => t.exerciseId === id);
      expect(task?.targetBpm).toBe(64);
      expect(task?.reason).toContain("+4 BPM après 3 réussites");
    });
  });

  it("réserve les pièces « challenge » aux séances longues", () => {
    const tasks = buildPlan(
      input({
        activePieces: [
          { id: "p-growth", title: "A", tier: "growth", currentStep: "" },
          { id: "p-challenge", title: "B", tier: "challenge", currentStep: "" },
        ],
      }),
    );
    const weekdays = weekDates(WEEK).slice(0, 5);
    expect(tasks.filter((t) => weekdays.includes(t.date) && t.pieceId === "p-challenge")).toHaveLength(0);
    expect(tasks.some((t) => t.pieceId === "p-challenge")).toBe(true);
  });

  it("respecte le niveau auto-évalué, +1 en mode ambitieux", () => {
    const mixed = [exercise("technique", 1, { level: 1 }), exercise("technique", 2, { level: 3 })];
    const base = input({ exercises: mixed });
    expect(buildPlan(base).some((t) => t.exerciseId === "technique-2")).toBe(false);
    const ambitious = input({
      exercises: mixed,
      settings: { ...base.settings, levels: { technique: 2 }, challengeLevel: "ambitious" },
    });
    expect(buildPlan(ambitious).some((t) => t.exerciseId === "technique-2")).toBe(true);
  });
});
