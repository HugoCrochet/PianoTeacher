import { describe, expect, it } from "vitest";
import {
  ALL_KEYS,
  chooseKey,
  effectiveKey,
  keyCoverage,
  keysByDifficulty,
  keyStatus,
  maxAccidentalsForLevel,
  type KeyLog,
} from "./keys";

describe("tonalités", () => {
  it("compte 24 tonalités distinctes", () => {
    expect(new Set(ALL_KEYS).size).toBe(24);
  });

  it("classe les tonalités des plus simples aux plus chargées", () => {
    expect(keysByDifficulty("major").slice(0, 5)).toEqual(["Do majeur", "Sol majeur", "Fa majeur", "Ré majeur", "Si♭ majeur"]);
    expect(keysByDifficulty("minor")[0]).toBe("La mineur");
  });

  it("ouvre les tonalités selon le niveau", () => {
    expect(maxAccidentalsForLevel(1)).toBe(2);
    expect(maxAccidentalsForLevel(3)).toBe(6);
  });

  it("mesure la couverture à partir des résultats", () => {
    const c = keyCoverage([
      { key: "Sol majeur", date: "2026-11-02", result: "retry" },
      { key: "Sol majeur", date: "2026-11-05", result: "success" },
    ]);
    expect(c.get("Sol majeur")).toEqual({ key: "Sol majeur", sessions: 2, successes: 1, lastDate: "2026-11-05" });
    expect(c.get("Do majeur")?.sessions).toBe(0);
  });
});

describe("effectiveKey", () => {
  it("ne compte que les gammes et l'harmonie, tonalité de la tâche en priorité", () => {
    expect(effectiveKey("scales_harmony", "Ré majeur", "Do majeur")).toBe("Ré majeur");
    expect(effectiveKey("scales_harmony", null, "Do majeur")).toBe("Do majeur");
    expect(effectiveKey("improvisation", null, "Do majeur")).toBeNull();
    expect(effectiveKey("scales_harmony", null, "Inconnue")).toBeNull();
  });
});

describe("chooseKey", () => {
  const played = (keys: string[]): KeyLog[] => keys.map((key, i) => ({ key, date: `2026-11-0${i + 1}`, result: "success" }));

  it("propose d'abord la plus simple des tonalités jamais jouées", () => {
    expect(chooseKey("major", 6, played(["Do majeur", "Sol majeur"]))).toEqual({ key: "Fa majeur", neverPlayed: true });
  });

  it("respecte la limite d'altérations", () => {
    const all = played(["Do majeur", "Sol majeur", "Fa majeur", "Ré majeur", "Si♭ majeur"]);
    const choice = chooseKey("major", 2, all);
    expect(choice.neverPlayed).toBe(false);
    // Toutes jouées une fois : la plus ancienne revient.
    expect(choice.key).toBe("Do majeur");
  });

  it("fait tourner les tonalités déjà proposées dans la semaine", () => {
    const assigned = new Map([["Do majeur", 1]]);
    expect(chooseKey("major", 2, [], assigned).key).toBe("Sol majeur");
  });

  it("est déterministe", () => {
    const logs = played(["La mineur"]);
    expect(chooseKey("minor", 4, logs)).toEqual(chooseKey("minor", 4, logs));
  });
});

describe("keyStatus", () => {
  it("n'installe jamais une tonalité sur une seule réussite", () => {
    expect(keyStatus(undefined)).toBe("never");
    expect(keyStatus({ key: "Do majeur", sessions: 1, successes: 1, lastDate: "2026-11-01" })).toBe("started");
    expect(keyStatus({ key: "Do majeur", sessions: 4, successes: 3, lastDate: "2026-11-04" })).toBe("installed");
  });
});
