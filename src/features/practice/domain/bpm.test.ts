import { describe, expect, it } from "vitest";
import { bpmProgress, type BpmLog } from "./bpm";

const ok = (bpm: number | null = null): BpmLog => ({ result: "success", bpm });
const retry: BpmLog = { result: "retry", bpm: null };

describe("bpmProgress", () => {
  it("renvoie null pour un exercice sans tempo", () => {
    expect(bpmProgress(null, 4, [ok(), ok(), ok()]).target).toBeNull();
  });

  it("ne déduit jamais la maîtrise d'une ou deux réussites", () => {
    expect(bpmProgress(60, 4, [ok(60)]).target).toBe(60);
    expect(bpmProgress(60, 4, [ok(60), ok(60)])).toEqual({ target: 60, streak: 2, justRaised: false });
  });

  it("augmente de l'incrément après 3 réussites consécutives", () => {
    expect(bpmProgress(60, 4, [ok(60), ok(62), ok(60)])).toEqual({ target: 64, streak: 0, justRaised: true });
  });

  it("remet le compteur à zéro après un « à retravailler »", () => {
    expect(bpmProgress(60, 4, [ok(60), ok(60), retry, ok(60), ok(60)]).target).toBe(60);
  });

  it("ne compte pas une réussite jouée sous la cible", () => {
    expect(bpmProgress(60, 4, [ok(60), ok(50), ok(60), ok(60)]).target).toBe(60);
  });

  it("compte une réussite sans BPM saisi", () => {
    expect(bpmProgress(60, 4, [ok(), ok(), ok()]).target).toBe(64);
  });

  it("monte par paliers successifs, chacun exigeant 3 nouvelles réussites", () => {
    const logs = [ok(60), ok(60), ok(60), ok(64), ok(64), ok(64), ok(68)];
    expect(bpmProgress(60, 4, logs)).toEqual({ target: 68, streak: 1, justRaised: false });
  });

  it("utilise l'incrément propre à l'exercice et plafonne à 300", () => {
    expect(bpmProgress(60, 8, [ok(), ok(), ok()]).target).toBe(68);
    expect(bpmProgress(298, 4, [ok(), ok(), ok()]).target).toBe(300);
  });
});
