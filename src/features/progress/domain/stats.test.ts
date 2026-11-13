import { describe, expect, it } from "vitest";
import { minutesPerDay, minutesPerDomain, streak, totalMinutes, type StatLog } from "./stats";

const log = (date: string, minutes: number, domain: StatLog["domain"] = "technique"): StatLog => ({
  date,
  minutes,
  domain,
  result: "success",
});

describe("statistiques", () => {
  const logs = [log("2026-11-09", 5), log("2026-11-09", 10, "repertoire"), log("2026-11-11", 25)];

  it("additionne les minutes réellement pratiquées par jour", () => {
    const days = minutesPerDay(logs, "2026-11-09");
    expect(days.map((d) => d.minutes)).toEqual([15, 0, 25, 0, 0, 0, 0]);
  });

  it("calcule un total sur une période et par domaine", () => {
    expect(totalMinutes(logs, "2026-11-09", "2026-11-15")).toBe(40);
    expect(minutesPerDomain(logs)).toEqual({ technique: 30, repertoire: 10 });
  });

  it("compte les jours d'affilée, sans casser la série tant que la journée n'est pas finie", () => {
    expect(streak(["2026-11-10", "2026-11-11", "2026-11-12"], "2026-11-12")).toBe(3);
    expect(streak(["2026-11-10", "2026-11-11"], "2026-11-12")).toBe(2);
    expect(streak(["2026-11-09"], "2026-11-12")).toBe(0);
    expect(streak([], "2026-11-12")).toBe(0);
  });
});
