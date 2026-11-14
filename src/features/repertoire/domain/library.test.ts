import { describe, expect, it } from "vitest";
import { countByStatus, filterPieces, genresIn, sortPieces, type LibraryPiece } from "./library";

const piece = (id: string, extra: Partial<LibraryPiece>): LibraryPiece => ({
  id,
  title: id,
  composer: "",
  style: "classical",
  period: null,
  status: "to_discover",
  level: null,
  currentStep: "",
  hasPdf: false,
  ...extra,
});

const pieces = [
  piece("1", { title: "Gymnopédie nº 1", composer: "Erik Satie", period: "modern", status: "active", level: 2 }),
  piece("2", { title: "Valse en la mineur", composer: "Frédéric Chopin", period: "romantic", level: 2 }),
  piece("3", { title: "Clair de lune", composer: "Claude Debussy", period: "modern", level: 4 }),
  piece("4", { title: "One Summer's Day", composer: "Joe Hisaishi", style: "film" }),
  piece("5", { title: "Adagio BWV 974", composer: "Johann S. Bach", period: "baroque", level: 4, status: "completed" }),
];

describe("répertoire : filtres", () => {
  it("compte les morceaux par statut", () => {
    expect(countByStatus(pieces)).toEqual({ active: 1, to_discover: 3, paused: 0, completed: 1 });
  });

  it("liste les genres présents, dans l'ordre d'affichage", () => {
    expect(genresIn(pieces)).toEqual(["baroque", "romantic", "modern", "film"]);
  });

  it("filtre par statut, genre et texte sans tenir compte des accents", () => {
    const ids = (f: Parameters<typeof filterPieces>[1]) => filterPieces(pieces, f).map((p) => p.id);
    expect(ids({ status: "to_discover", genre: null, query: "" })).toEqual(["2", "3", "4"]);
    expect(ids({ status: "to_discover", genre: "modern", query: "" })).toEqual(["3"]);
    expect(ids({ status: "to_discover", genre: "film", query: "" })).toEqual(["4"]);
    expect(ids({ status: "active", genre: null, query: "gymnopedie" })).toEqual(["1"]);
    expect(ids({ status: "to_discover", genre: null, query: "chopin valse" })).toEqual(["2"]);
    expect(ids({ status: "to_discover", genre: null, query: "mozart" })).toEqual([]);
  });
});

describe("répertoire : tri", () => {
  it("trie par titre, par nom de famille du compositeur ou par difficulté", () => {
    expect(sortPieces(pieces, "title").map((p) => p.id)).toEqual(["5", "3", "1", "4", "2"]);
    expect(sortPieces(pieces, "composer").map((p) => p.id)).toEqual(["5", "2", "3", "4", "1"]);
    // Difficulté croissante, non précisée à la fin.
    expect(sortPieces(pieces, "level").map((p) => p.id)).toEqual(["1", "2", "5", "3", "4"]);
  });
});
