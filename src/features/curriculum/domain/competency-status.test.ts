import { describe, expect, it } from "vitest";
import {
  acquisitionSteps,
  acquisitionSummary,
  competencyStatus,
  currentLevel,
  type CompetencyLog,
} from "./competency-status";

const ok = (date: string): CompetencyLog => ({ result: "success", date });
const retry = (date: string): CompetencyLog => ({ result: "retry", date });

describe("competencyStatus", () => {
  it("est « à venir » sans aucun résultat", () => {
    expect(competencyStatus([])).toBe("upcoming");
  });

  it("n'est jamais acquise sur une seule réussite", () => {
    expect(competencyStatus([ok("2026-11-01")])).toBe("learning");
  });

  it("passe en consolidation après 3 réussites sur au moins 2 jours", () => {
    expect(competencyStatus([ok("2026-11-01"), ok("2026-11-01"), ok("2026-11-01")])).toBe("learning");
    expect(competencyStatus([ok("2026-11-01"), ok("2026-11-01"), ok("2026-11-03")])).toBe("consolidating");
  });

  it("est acquise après 5 réussites sur 3 jours, les 3 dernières validées", () => {
    const logs = [ok("2026-11-01"), ok("2026-11-03"), ok("2026-11-05"), ok("2026-11-05"), ok("2026-11-07")];
    expect(competencyStatus(logs)).toBe("acquired");
    expect(competencyStatus([...logs, retry("2026-11-09")])).toBe("consolidating");
  });
});

describe("currentLevel", () => {
  it("renvoie le premier niveau non entièrement acquis", () => {
    const progress = currentLevel([
      { level: 1, status: "acquired" },
      { level: 1, status: "acquired" },
      { level: 2, status: "learning" },
      { level: 2, status: "upcoming" },
    ]);
    expect(progress).toMatchObject({ level: 2, done: 0, total: 2 });
    expect(progress?.percent).toBeGreaterThan(0);
  });

  it("renvoie null sans compétence", () => {
    expect(currentLevel([])).toBeNull();
  });
});

describe("acquisitionSteps", () => {
  const log = (date: string, result: CompetencyLog["result"]): CompetencyLog => ({ date, result });

  it("liste tout ce qui manque sans historique", () => {
    const steps = acquisitionSteps([]);
    expect(steps.every((s) => !s.done && s.current === 0)).toBe(true);
    expect(acquisitionSummary(steps)).toBe("Encore 5 réussites de plus, sur 3 jours de plus, dont les 3 dernières d’affilée.");
  });

  it("est cohérent avec le statut « Acquise »", () => {
    const logs = [
      log("2026-11-01", "success"),
      log("2026-11-02", "success"),
      log("2026-11-02", "retry"),
      log("2026-11-03", "success"),
      log("2026-11-04", "success"),
      log("2026-11-04", "success"),
    ];
    for (let n = 0; n <= logs.length; n += 1) {
      const slice = logs.slice(0, n);
      const allDone = acquisitionSteps(slice).every((s) => s.done);
      expect(allDone).toBe(competencyStatus(slice) === "acquired");
    }
    expect(acquisitionSummary(acquisitionSteps(logs))).toBe("");
  });

  it("compte la série en cours depuis le dernier résultat", () => {
    const steps = acquisitionSteps([log("1", "success"), log("2", "retry"), log("3", "success")]);
    expect(steps[2]).toMatchObject({ current: 1, target: 3, done: false });
  });
});
