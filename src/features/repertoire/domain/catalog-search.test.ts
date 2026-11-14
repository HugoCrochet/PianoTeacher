import { describe, expect, it } from "vitest";
import {
  imslpSearchUrl,
  isImslpUrl,
  lifespan,
  periodFromEpoch,
  prefillParams,
  sortWorks,
  translateQuery,
  translateTitle,
  type FoundWork,
} from "./catalog-search";

describe("translateTitle", () => {
  it.each([
    ["Waltz in A minor, B.150", "Valse en la mineur, B.150"],
    ["Waltz in A flat major, op. 42", "Valse en la bémol majeur, op. 42"],
    ["Prelude in C sharp minor, op. 45", "Prélude en do dièse mineur, op. 45"],
    ["Piano Sonata no. 11 in A major, K.331", "Sonate pour piano nº 11 en la majeur, K.331"],
    ["Preludes, op. 28", "Préludes, op. 28"],
    ["Prelude and Fugue in C major, BWV.846", "Prélude et Fugue en do majeur, BWV.846"],
    ["Gymnopedie, for piano no. 1", "Gymnopédie, pour piano nº 1"],
    ["Fantasy in C major, op. 17", "Fantaisie en do majeur, op. 17"],
    ["Valse-impromptu no. 3 in D", "Valse-impromptu nº 3 en ré"],
    ["Carnaval, op. 9", "Carnaval, op. 9"],
    ['Waltz in E flat major, op. 18, "Grande valse brillante"', 'Valse en mi bémol majeur, op. 18, "Grande valse brillante"'],
  ])("%s → %s", (en, fr) => {
    expect(translateTitle(en)).toBe(fr);
  });

  it("nettoie les espaces en trop", () => {
    expect(translateTitle("Prelude  in C minor, BWV.921")).toBe("Prélude en do mineur, BWV.921");
  });
});

describe("translateQuery", () => {
  it.each([
    ["Chopin valse en la mineur", "chopin waltz a minor"],
    ["prélude en do dièse mineur", "prelude c sharp minor"],
    ["Satie gymnopédie", "satie gymnopedie"],
    ["sonate pour piano Mozart", "sonata mozart"],
    ["la valse", "waltz"],
    ["Schumann", "schumann"],
  ])("%s → %s", (fr, en) => {
    expect(translateQuery(fr)).toBe(en);
  });

  it("ignore les caractères spéciaux et limite la longueur", () => {
    expect(translateQuery("bach <script>")).toBe("bach script");
    expect(translateQuery("a".repeat(500)).length).toBeLessThanOrEqual(120);
  });
});

describe("outils", () => {
  it("traduit les époques d'Open Opus en courants", () => {
    expect(periodFromEpoch("Late Romantic")).toBe("late_romantic");
    expect(periodFromEpoch("20th Century")).toBe("twentieth_century");
    expect(periodFromEpoch("Inconnue")).toBeNull();
    expect(periodFromEpoch(null)).toBeNull();
  });

  it("construit un lien de recherche IMSLP", () => {
    const url = imslpSearchUrl("Frédéric Chopin", 'Waltz in A minor, B.150');
    expect(url).toBe("https://imslp.org/wiki/Special:Search?search=Chopin%20Waltz%20in%20A%20minor%2C%20B.150");
    expect(isImslpUrl(url)).toBe(true);
    expect(isImslpUrl("https://exemple.fr")).toBe(false);
  });

  it("formate les dates du compositeur", () => {
    expect(lifespan("1810-01-01", "1849-01-01")).toBe("1810–1849");
    expect(lifespan(null, null)).toBe("");
  });

  const work = (id: string, title: string, popular: boolean, originalTitle = title): FoundWork => ({
    id,
    title,
    originalTitle,
    composer: "Frédéric Chopin",
    composerId: "152",
    period: "romantic",
    lifespan: "1810–1849",
    popular,
  });

  it("met les œuvres populaires en tête et retire les doublons", () => {
    const sorted = sortWorks([work("2", "Valse B", false), work("1", "Valse A", true), work("3", "Valse B", false)]);
    expect(sorted.map((w) => w.id)).toEqual(["1", "2"]);
  });

  it("prépare le pré-remplissage du formulaire", () => {
    const p = prefillParams(work("17270", "Valse en la mineur, B.150", true, "Waltz in A minor, B.150"));
    expect(p.get("titre")).toBe("Valse en la mineur, B.150");
    expect(p.get("compositeur")).toBe("Frédéric Chopin");
    expect(p.get("courant")).toBe("romantic");
    expect(p.get("partition")).toContain("imslp.org");
  });
});
