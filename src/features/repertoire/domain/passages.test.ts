import { describe, expect, it } from "vitest";
import { choosePassage, lastBpm, passageStatus, splitMeasures, type Passage, type PassageLog } from "./passages";

const passages: Passage[] = [
  { id: "a", position: 1, label: "Mesures 1–8", targetBpm: 60 },
  { id: "b", position: 2, label: "Mesures 9–16", targetBpm: null },
  { id: "c", position: 3, label: "Mesures 17–24", targetBpm: null },
];
const log = (passageId: string, date: string, result: PassageLog["result"], bpm: number | null = null): PassageLog => ({
  passageId,
  date,
  result,
  bpm,
});

describe("passageStatus", () => {
  it("n'est jamais solide sur une seule réussite", () => {
    expect(passageStatus([])).toBe("new");
    expect(passageStatus([log("a", "2026-11-01", "success")])).toBe("learning");
  });
  it("devient solide après 3 réussites dont les 2 dernières", () => {
    const logs = [log("a", "1", "success"), log("a", "2", "retry"), log("a", "3", "success"), log("a", "4", "success")];
    expect(passageStatus(logs)).toBe("solid");
    expect(passageStatus([...logs, log("a", "5", "retry")])).toBe("learning");
  });
});

describe("choosePassage", () => {
  it("ne propose rien sans passage", () => {
    expect(choosePassage([], [])).toBeNull();
  });

  it("commence par le premier passage quand rien n'est travaillé", () => {
    expect(choosePassage(passages, [])?.passage.id).toBe("a");
  });

  it("cible d'abord le passage raté la dernière fois", () => {
    const logs = [log("a", "2026-11-01", "success"), log("b", "2026-11-02", "retry")];
    const choice = choosePassage(passages, logs);
    expect(choice?.passage.id).toBe("b");
    expect(choice?.reason).toBe("passage le plus fragile : « Mesures 9–16 », à retravailler la dernière fois");
  });

  it("préfère un passage en travail à un passage jamais travaillé", () => {
    const logs = [log("b", "2026-11-02", "success")];
    expect(choosePassage(passages, logs)?.passage.id).toBe("b");
  });

  it("passe au suivant quand les autres sont solides", () => {
    const solid = ["1", "2", "3"].map((d) => log("a", d, "success"));
    expect(choosePassage(passages, solid)?.passage.id).toBe("b");
  });

  it("fait tourner dans la semaine les passages en travail à égalité", () => {
    const logs = [log("a", "2026-11-01", "success"), log("b", "2026-11-01", "success")];
    expect(choosePassage(passages, logs, new Map([["a", 1]]))?.passage.id).toBe("b");
  });

  it("prend les passages jamais travaillés dans l'ordre du morceau", () => {
    expect(choosePassage(passages, [], new Map([["a", 3]]))?.passage.id).toBe("a");
  });
});

describe("outils", () => {
  it("retrouve le dernier BPM saisi", () => {
    expect(lastBpm([log("a", "1", "success", 52), log("a", "2", "retry")])).toBe(52);
    expect(lastBpm([])).toBeNull();
  });
  it("découpe un morceau en passages égaux", () => {
    expect(splitMeasures(20, 8)).toEqual(["Mesures 1–8", "Mesures 9–16", "Mesures 17–20"]);
    expect(splitMeasures(9, 8)).toEqual(["Mesures 1–8", "Mesure 9"]);
  });
});
