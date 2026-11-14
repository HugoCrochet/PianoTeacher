import { describe, expect, it } from "vitest";
import type { KeyStatus } from "@/lib/domain/keys";
import { MAJOR_TONICS, MINOR_TONICS, circleKey, drawPool, drawProgression, scaleOf } from "./random-progression";

/** Générateur pseudo-aléatoire reproductible pour les tests. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("tonalités du tirage", () => {
  it("couvre les 12 toniques dans chaque mode", () => {
    expect(MAJOR_TONICS).toHaveLength(12);
    expect(MINOR_TONICS).toHaveLength(12);
    expect(MAJOR_TONICS).toContain("Sol♭");
    expect(MAJOR_TONICS).toContain("Ré♭");
  });

  it("orthographie les gammes", () => {
    expect(scaleOf("Sol♭", "major")).toEqual(["Sol♭", "La♭", "Si♭", "Do♭", "Ré♭", "Mi♭", "Fa"]);
    expect(scaleOf("Do♯", "minor")).toEqual(["Do♯", "Ré♯", "Mi", "Fa♯", "Sol♯", "La", "Si"]);
    expect(scaleOf("Mi♭", "minor")).toEqual(["Mi♭", "Fa", "Sol♭", "La♭", "Si♭", "Do♭", "Ré♭"]);
  });
});

describe("drawProgression", () => {
  it("donne toujours 3 ou 4 accords, en commençant sur la tonique", () => {
    const random = seeded(42);
    for (let i = 0; i < 500; i += 1) {
      const d = drawProgression(random);
      expect([3, 4]).toContain(d.chords.length);
      expect(d.chords[0].roman).toBe(d.mode === "major" ? "I" : "i");
      expect(d.chords[0].name.startsWith(d.tonic)).toBe(true);
    }
  });

  it("ne répète jamais un accord d'affilée et ne finit pas sur la tonique", () => {
    const random = seeded(7);
    for (let i = 0; i < 500; i += 1) {
      const romans = drawProgression(random).chords.map((c) => c.roman);
      for (let j = 1; j < romans.length; j += 1) expect(romans[j]).not.toBe(romans[j - 1]);
      expect(romans[romans.length - 1]).not.toBe(romans[0]);
    }
  });

  it("ne tire que dans les tonalités autorisées", () => {
    const random = seeded(5);
    const allowed = ["Sol majeur", "Mi mineur"];
    const keys = new Set(Array.from({ length: 200 }, () => drawProgression(random, { allowedKeys: allowed }).key));
    expect([...keys].sort()).toEqual(["Mi mineur", "Sol majeur"]);
  });

  it("garde une tonalité autorisée même si le mode demandé n'en a pas", () => {
    const d = drawProgression(seeded(1), { allowedKeys: ["Sol majeur"], mode: "minor" });
    expect(d.key).toBe("Sol majeur");
  });

  it("respecte le mode et le nombre d'accords demandés", () => {
    const random = seeded(3);
    for (let i = 0; i < 100; i += 1) {
      const d = drawProgression(random, { mode: "minor", count: 4 });
      expect(d.mode).toBe("minor");
      expect(d.key.endsWith("mineur")).toBe(true);
      expect(d.chords).toHaveLength(4);
    }
  });

  it("écrit les accords de la tonalité (sans accord diminué)", () => {
    const random = seeded(11);
    for (let i = 0; i < 300; i += 1) {
      const d = drawProgression(random);
      for (const c of d.chords) {
        const root = c.name.replace(/ m$/, "");
        expect(d.scale).toContain(root);
        expect(c.name).not.toMatch(/°|dim/);
      }
    }
  });

  it("finit par tirer toutes les toniques et les deux modes", () => {
    const random = seeded(99);
    const keys = new Set(Array.from({ length: 2000 }, () => drawProgression(random).key));
    expect(keys.size).toBe(24);
  });

  it("donne un V majeur en mineur (sensible)", () => {
    const random = seeded(21);
    const withV = Array.from({ length: 300 }, () => drawProgression(random, { mode: "minor" })).filter((d) =>
      d.chords.some((c) => c.roman === "V"),
    );
    expect(withV.length).toBeGreaterThan(0);
    for (const d of withV) expect(d.chords.find((c) => c.roman === "V")?.name).toBe(d.scale[4]);
  });
});

describe("drawPool", () => {
  const statuses = (map: Record<string, KeyStatus>) => (k: string) => map[k] ?? "never";

  it("prend les tonalités bien installées, avec l'orthographe du cercle", () => {
    const pool = drawPool(statuses({ "Do majeur": "installed", "Fa♯ majeur": "installed", "Ré majeur": "started" }), false);
    expect(pool).toEqual({ keys: ["Do majeur", "Sol♭ majeur"], basis: "installed" });
    expect(circleKey("Mi♭ mineur")).toBe("Ré♯ mineur");
  });

  it("se replie sur les tonalités travaillées, puis sur do majeur et la mineur", () => {
    expect(drawPool(statuses({ "Ré majeur": "started" }), false)).toEqual({ keys: ["Ré majeur"], basis: "started" });
    expect(drawPool(statuses({}), false)).toEqual({ keys: ["Do majeur", "La mineur"], basis: "starter" });
  });

  it("ouvre les 24 tonalités quand on veut explorer", () => {
    const pool = drawPool(statuses({ "Do majeur": "installed" }), true);
    expect(pool.basis).toBe("all");
    expect(pool.keys).toHaveLength(24);
  });
});
