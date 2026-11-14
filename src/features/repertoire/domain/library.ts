import type { PieceStatus } from "@/lib/domain/domains";
import { GENRES, genreOf, type Genre } from "./catalog-search";

/**
 * Liste du répertoire : recherche, filtres et tri. Fonctions pures.
 */

export interface LibraryPiece {
  id: string;
  title: string;
  composer: string;
  style: string;
  period: string | null;
  status: PieceStatus;
  level: number | null;
  currentStep: string;
  hasPdf: boolean;
}

export const STATUS_TABS: readonly PieceStatus[] = ["active", "to_discover", "paused", "completed"];

export const SORTS = ["title", "composer", "level"] as const;
export type Sort = (typeof SORTS)[number];
export const SORT_LABEL: Record<Sort, string> = {
  title: "Titre",
  composer: "Compositeur",
  level: "Difficulté",
};
export function isSort(value: unknown): value is Sort {
  return typeof value === "string" && (SORTS as readonly string[]).includes(value);
}

/** Minuscules sans accents, pour chercher « gymnopedie » ou « Gymnopédie ». */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function countByStatus(pieces: readonly LibraryPiece[]): Record<PieceStatus, number> {
  const counts: Record<PieceStatus, number> = { active: 0, to_discover: 0, paused: 0, completed: 0 };
  for (const p of pieces) counts[p.status] += 1;
  return counts;
}

/** Genres présents dans une liste, dans l'ordre d'affichage. */
export function genresIn(pieces: readonly LibraryPiece[]): Genre[] {
  const present = new Set(pieces.map((p) => genreOf(p.style, p.period)));
  return GENRES.filter((g) => present.has(g));
}

export interface LibraryFilter {
  status: PieceStatus;
  genre: Genre | null;
  /** Texte libre : tous les mots doivent figurer dans le titre ou le compositeur. */
  query: string;
}

export function filterPieces(pieces: readonly LibraryPiece[], filter: LibraryFilter): LibraryPiece[] {
  const words = normalize(filter.query).split(/\s+/).filter(Boolean);
  return pieces.filter((p) => {
    if (p.status !== filter.status) return false;
    if (filter.genre && genreOf(p.style, p.period) !== filter.genre) return false;
    const haystack = normalize(`${p.title} ${p.composer}`);
    return words.every((w) => haystack.includes(w));
  });
}

/** Nom de famille pour le tri : « Johann S. Bach » → « bach ». */
function lastName(composer: string): string {
  const parts = composer.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  return normalize(parts[parts.length - 1] ?? "");
}

export function sortPieces(pieces: readonly LibraryPiece[], sort: Sort): LibraryPiece[] {
  const byTitle = (a: LibraryPiece, b: LibraryPiece) => a.title.localeCompare(b.title, "fr") || a.id.localeCompare(b.id);
  return [...pieces].sort((a, b) => {
    if (sort === "composer") return lastName(a.composer).localeCompare(lastName(b.composer), "fr") || byTitle(a, b);
    // Difficulté : du plus facile au plus difficile, les non précisées à la fin.
    if (sort === "level") return (a.level ?? 99) - (b.level ?? 99) || byTitle(a, b);
    return byTitle(a, b);
  });
}
