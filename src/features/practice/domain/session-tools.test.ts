import { describe, expect, it } from "vitest";
import { beatSeconds, clampBpm, formatClock, measuredMinutes, remainingSeconds } from "./session-tools";

describe("clampBpm", () => {
  it("borne entre 30 et 240 et arrondit", () => {
    expect(clampBpm(10)).toBe(30);
    expect(clampBpm(400)).toBe(240);
    expect(clampBpm(72.4)).toBe(72);
  });
  it("revient à 60 pour une valeur invalide", () => {
    expect(clampBpm(Number.NaN)).toBe(60);
  });
});

describe("beatSeconds", () => {
  it("donne la durée d'un temps", () => {
    expect(beatSeconds(60)).toBe(1);
    expect(beatSeconds(120)).toBe(0.5);
  });
});

describe("minuteur", () => {
  it("calcule le temps restant et le dépassement", () => {
    expect(remainingSeconds(5, 120)).toBe(180);
    expect(remainingSeconds(5, 323)).toBe(-23);
  });
  it("formate en m:ss, avec + pour le dépassement", () => {
    expect(formatClock(187)).toBe("3:07");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-23)).toBe("+0:23");
    expect(formatClock(-61.9)).toBe("+1:01");
  });
  it("arrondit la durée réelle à la minute, au moins 1", () => {
    expect(measuredMinutes(0)).toBe(1);
    expect(measuredMinutes(29)).toBe(1);
    expect(measuredMinutes(150)).toBe(3);
    expect(measuredMinutes(260)).toBe(4);
  });
});
