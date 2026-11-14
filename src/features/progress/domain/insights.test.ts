import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import type { Domain, PracticeResult } from "@/lib/domain/domains";
import { minutesPerDomainByWeek, practiceCalendar } from "./calendar";
import { longestStreak, milestones, type MilestoneLog } from "./milestones";
import type { StatLog } from "./stats";
import { weeklySummary, type SummaryLog } from "./weekly-summary";

const TODAY = "2026-11-14"; // samedi
const MONDAY = "2026-11-09";

const stat = (date: string, minutes: number, domain: Domain = "technique", result: PracticeResult = "success"): StatLog => ({
  date,
  minutes,
  domain,
  result,
});

describe("practiceCalendar", () => {
  const goal = (date: string) => (date.endsWith("14") || date.endsWith("15") ? 60 : 25);

  it("donne des semaines complètes, de la plus ancienne à la semaine en cours", () => {
    const cal = practiceCalendar([], TODAY, 4, goal);
    expect(cal).toHaveLength(4);
    expect(cal.every((w) => w.length === 7)).toBe(true);
    expect(cal[3][0].date).toBe(MONDAY);
    expect(cal[0][0].date).toBe(addDays(MONDAY, -21));
    expect(cal[3][6]).toMatchObject({ date: "2026-11-15", future: true });
  });

  it("distingue pratique et durée prévue atteinte, sans jamais marquer de manque", () => {
    const cal = practiceCalendar([stat(MONDAY, 10), stat("2026-11-10", 20), stat("2026-11-10", 5)], TODAY, 1, goal);
    expect(cal[0][0].level).toBe("practiced");
    expect(cal[0][1]).toMatchObject({ minutes: 25, level: "goal" });
    expect(cal[0][2].level).toBe("none");
  });
});

describe("minutesPerDomainByWeek", () => {
  it("répartit les minutes réelles par semaine et par domaine", () => {
    const weeks = minutesPerDomainByWeek(
      [stat(MONDAY, 10, "technique"), stat(MONDAY, 15, "repertoire"), stat(addDays(MONDAY, -7), 5, "improvisation")],
      TODAY,
      4,
    );
    expect(weeks.map((w) => w.weekStart)).toEqual([addDays(MONDAY, -21), addDays(MONDAY, -14), addDays(MONDAY, -7), MONDAY]);
    expect(weeks[3]).toMatchObject({ total: 25, byDomain: { technique: 10, repertoire: 15, improvisation: 0 } });
    expect(weeks[2].byDomain.improvisation).toBe(5);
  });
});

describe("weeklySummary", () => {
  const log = (date: string, extra: Partial<SummaryLog> = {}): SummaryLog => ({
    date,
    minutes: 10,
    domain: "technique",
    result: "success",
    bpm: null,
    title: "Gamme de ré majeur",
    trackId: "ex-1",
    key: null,
    ...extra,
  });
  const previousWeek = addDays(MONDAY, -7);

  it("reste encourageant après une semaine sans pratique", () => {
    const s = weeklySummary([log(addDays(MONDAY, -10))], previousWeek);
    expect(s.title).toBe("Une semaine de pause");
    expect(s.lines.join(" ")).not.toMatch(/manqu|retard|dette/);
  });

  it("résume temps, jours, domaines, tempo, tonalités et résultats", () => {
    const logs = [
      log(addDays(previousWeek, -3), { bpm: 64, key: "Do majeur" }),
      log(previousWeek, { bpm: 68, minutes: 20, key: "Ré majeur" }),
      log(addDays(previousWeek, 2), { bpm: 72, domain: "repertoire", title: "Prélude", trackId: "p-1" }),
      log(addDays(previousWeek, 2), { result: "retry", domain: "improvisation", trackId: "ex-2" }),
    ];
    const s = weeklySummary(logs, previousWeek);
    expect(s.title).toBe("2 jours de pratique, 40 min");
    expect(s.lines).toContain("Tempo en hausse : +4 BPM sur Gamme de ré majeur.");
    expect(s.lines).toContain("Nouvelle tonalité : Ré majeur.");
    expect(s.lines.some((l) => l.startsWith("3 domaines travaillés"))).toBe(true);
    expect(s.lines.some((l) => l.includes("1 tâche à retravailler : elles reviendront"))).toBe(true);
  });

  it("ne compare à la semaine d'avant que pour souligner un progrès", () => {
    const more = weeklySummary([log(addDays(previousWeek, -7)), log(previousWeek, { minutes: 30 })], previousWeek);
    expect(more.lines[0]).toBe("20 min de plus que la semaine d’avant.");
    const less = weeklySummary([log(addDays(previousWeek, -7), { minutes: 60 }), log(previousWeek)], previousWeek);
    expect(less.lines.join(" ")).not.toMatch(/moins/);
  });
});

describe("milestones", () => {
  const m = (date: string, extra: Partial<MilestoneLog> = {}): MilestoneLog => ({
    date,
    minutes: 30,
    result: "success",
    key: null,
    exerciseId: null,
    pieceId: null,
    passageId: null,
    bpm: null,
    ...extra,
  });

  it("propose un premier jalon sans historique", () => {
    expect(milestones([]).next[0].label).toBe("Première séance");
  });

  it("date chaque palier au jour où il est franchi", () => {
    const logs = Array.from({ length: 10 }, (_, i) => m(addDays("2026-10-01", i)));
    const r = milestones(logs);
    expect(r.achieved.find((a) => a.id === "sessions-10")?.date).toBe("2026-10-10");
    expect(r.achieved.find((a) => a.id === "hours-5")?.date).toBe("2026-10-10");
    expect(r.achieved.find((a) => a.id === "first")?.date).toBe("2026-10-01");
    expect(r.next[0]).toEqual({ label: "25 jours de pratique", remaining: "encore 15 jours" });
    expect(r.records).toContainEqual({ label: "Plus longue série", value: "10 jours d’affilée", date: "2026-10-10" });
  });

  it("installe une tonalité à la 3e réussite, jamais avant", () => {
    const logs = [m("2026-11-01", { key: "Sol majeur" }), m("2026-11-02", { key: "Sol majeur", result: "retry" }), m("2026-11-03", { key: "Sol majeur" })];
    expect(milestones(logs).achieved.some((a) => a.id === "key-Sol majeur")).toBe(false);
    const r = milestones([...logs, m("2026-11-05", { key: "Sol majeur" })]);
    expect(r.achieved.find((a) => a.id === "key-Sol majeur")?.date).toBe("2026-11-05");
  });

  it("célèbre un morceau quand tous ses passages sont solides", () => {
    const piece = { id: "p", title: "Menuet", passageIds: ["a", "b"], completedOn: null };
    const p = (date: string, passageId: string) => m(date, { pieceId: "p", passageId });
    const d = (n: number) => addDays("2026-11-01", n);
    const logs = [p(d(0), "a"), p(d(1), "a"), p(d(2), "a"), p(d(3), "b"), p(d(4), "b")];
    expect(milestones(logs, [piece]).achieved.some((a) => a.id === "piece-solid-p")).toBe(false);
    const r = milestones([...logs, p(d(5), "b")], [piece]);
    expect(r.achieved.find((a) => a.id === "piece-solid-p")).toMatchObject({ label: "Tous les passages solides : Menuet", date: d(5) });
  });

  it("date une compétence acquise selon la règle du parcours", () => {
    const ex = (n: number) => m(addDays("2026-11-01", n), { exerciseId: "e1" });
    const competencies = [{ name: "Legato", exerciseIds: ["e1"] }];
    expect(milestones([ex(0), ex(1), ex(2), ex(2)], [], competencies).achieved.some((a) => a.id === "competency-Legato")).toBe(false);
    const r = milestones([ex(0), ex(1), ex(2), ex(2), ex(3)], [], competencies);
    expect(r.achieved.find((a) => a.id === "competency-Legato")?.date).toBe(addDays("2026-11-01", 3));
  });

  it("calcule la plus longue série de jours consécutifs", () => {
    expect(longestStreak(["2026-11-01", "2026-11-02", "2026-11-04", "2026-11-05", "2026-11-06"])).toEqual({ days: 3, end: "2026-11-06" });
    expect(longestStreak([])).toEqual({ days: 0, end: null });
  });
});
