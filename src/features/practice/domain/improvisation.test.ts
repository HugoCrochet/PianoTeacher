import { describe, expect, it } from "vitest";
import { keyAccidentals } from "@/lib/domain/keys";
import { improvisationPrompt, scaleNotes } from "./improvisation";

describe("scaleNotes", () => {
  it("orthographie les gammes majeures et mineures relatives", () => {
    expect(scaleNotes("Ré majeur")).toEqual(["Ré", "Mi", "Fa♯", "Sol", "La", "Si", "Do♯"]);
    expect(scaleNotes("La mineur")).toEqual(["La", "Si", "Do", "Ré", "Mi", "Fa", "Sol"]);
    expect(scaleNotes("Do mineur")).toEqual(["Do", "Ré", "Mi♭", "Fa", "Sol", "La♭", "Si♭"]);
  });
});

describe("improvisationPrompt", () => {
  it("est déterministe : même jour et même exercice → même variante", () => {
    expect(improvisationPrompt("2026-11-14", "impro-ostinato", 1)).toEqual(
      improvisationPrompt("2026-11-14", "impro-ostinato", 1),
    );
  });

  it("varie d'un jour à l'autre", () => {
    const days = Array.from({ length: 14 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
    const variants = new Set(days.map((d) => JSON.stringify(improvisationPrompt(d, "impro-grille-i-iv-v", 2))));
    expect(variants.size).toBeGreaterThan(7);
  });

  it("reste dans les tonalités accessibles au niveau", () => {
    for (let d = 1; d <= 28; d += 1) {
      const p = improvisationPrompt(`2026-11-${String(d).padStart(2, "0")}`, "impro-cinq-notes", 1);
      expect(keyAccidentals(p.key)).toBeLessThanOrEqual(2);
    }
  });

  it("écrit la grille avec les accords de la tonalité", () => {
    // Recherche d'un jour où la grille I–IV–V–I tombe, pour vérifier l'orthographe des accords.
    for (let d = 1; d <= 200; d += 1) {
      const date = new Date(Date.UTC(2026, 0, d)).toISOString().slice(0, 10);
      const p = improvisationPrompt(date, "impro-grille-i-iv-v", 2);
      if (p.degrees === "I–IV–V–I" && p.key === "Sol majeur") {
        expect(p.grid).toBe("Sol | Do | Ré | Sol");
        return;
      }
      if (p.degrees === "i–iv–V–i" && p.key === "La mineur") {
        expect(p.grid).toBe("La m | Ré m | Mi | La m");
        return;
      }
    }
    throw new Error("aucune grille de contrôle trouvée sur 200 jours");
  });
});
