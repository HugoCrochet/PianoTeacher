/**
 * Recherche d'œuvres (Open Opus) : traductions, courants et liens de partition.
 * Fonctions pures, sans réseau (docs/adr/0002-recherche-oeuvres-open-opus.md).
 */

/** Courants regroupés en quatre familles, volontairement simples. */
export const PERIODS = ["baroque", "classical", "romantic", "modern"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  baroque: "Baroque",
  classical: "Classique",
  romantic: "Romantique",
  modern: "Moderne",
};

export function isPeriod(value: unknown): value is Period {
  return typeof value === "string" && (PERIODS as readonly string[]).includes(value);
}

const EPOCHS: Record<string, Period> = {
  Baroque: "baroque",
  Classical: "classical",
  "Early Romantic": "romantic",
  Romantic: "romantic",
  "Late Romantic": "romantic",
  "20th Century": "modern",
  "Post-War": "modern",
  "21st Century": "modern",
};

/** Compositeurs qu'Open Opus classe « Late Romantic » mais qu'on range en « Moderne ». */
const MODERN_COMPOSERS = ["debussy", "ravel", "satie"];

/** Époque Open Opus → courant de l'application (null si inconnue ou antérieure au baroque). */
export function periodFromEpoch(epoch: string | null | undefined, composer = ""): Period | null {
  const period = (epoch && EPOCHS[epoch.trim()]) || null;
  if (period === "romantic" && MODERN_COMPOSERS.some((name) => composer.toLowerCase().includes(name))) return "modern";
  return period;
}

/* ---------------------------------------------------------------------------
 * Genre : la seule classification montrée à l'utilisateur.
 * En base : `style` (classical / film / other) + `period` (courant, pour le classique).
 * ------------------------------------------------------------------------- */

export const GENRES = [...PERIODS, "film", "other"] as const;
export type Genre = (typeof GENRES)[number];

export const GENRE_LABEL: Record<Genre, string> = {
  ...PERIOD_LABEL,
  film: "Musique de film",
  other: "Autre",
};

export function isGenre(value: unknown): value is Genre {
  return typeof value === "string" && (GENRES as readonly string[]).includes(value);
}

export function genreOf(style: string, period: string | null): Genre {
  if (style === "film") return "film";
  return style === "classical" && isPeriod(period) ? period : "other";
}

export function genreColumns(genre: Genre): { style: "classical" | "film" | "other"; period: Period | null } {
  if (genre === "film") return { style: "film", period: null };
  if (genre === "other") return { style: "other", period: null };
  return { style: "classical", period: genre };
}

/* ---------------------------------------------------------------------------
 * Titres : anglais (Open Opus) → français, pour les formes courantes.
 * ------------------------------------------------------------------------- */

const NOTE_FR: Record<string, string> = { A: "la", B: "si", C: "do", D: "ré", E: "mi", F: "fa", G: "sol" };

/** Formes musicales, du plus spécifique au plus général. */
const FORMS: readonly [RegExp, string][] = [
  [/\bSongs? without Words\b/g, "Romances sans paroles"],
  [/\bPiano Sonatas\b/g, "Sonates pour piano"],
  [/\bPiano Sonata\b/g, "Sonate pour piano"],
  [/\bWaltzes\b/g, "Valses"],
  [/\bWaltz\b/g, "Valse"],
  [/\bPreludes\b/g, "Préludes"],
  [/\bPrelude\b/g, "Prélude"],
  [/\b[EÉ]tudes\b/g, "Études"],
  [/\b[EÉ]tude\b/g, "Étude"],
  [/\bSonatinas\b/g, "Sonatines"],
  [/\bSonatina\b/g, "Sonatine"],
  [/\bSonatas\b/g, "Sonates"],
  [/\bSonata\b/g, "Sonate"],
  [/\bMinuets\b/g, "Menuets"],
  [/\bMinuet\b/g, "Menuet"],
  [/\bFantasias?\b/g, "Fantaisie"],
  [/\bFantasy\b/g, "Fantaisie"],
  [/\bFantasies\b/g, "Fantaisies"],
  [/\bGymnop[eé]dies\b/g, "Gymnopédies"],
  [/\bGymnop[eé]die\b/g, "Gymnopédie"],
  [/\bTheme\b/g, "Thème"],
  [/\bPieces\b/g, "Pièces"],
  [/\bfor piano\b/g, "pour piano"],
  [/\bfor keyboard\b/g, "pour clavier"],
];

/** « in A flat major » → « en la bémol majeur ». */
function translateKey(title: string): string {
  return title.replace(/\bin ([A-G])(?:[- ](flat|sharp))?(?: (major|minor))?\b/g, (_m, note: string, acc?: string, mode?: string) => {
    const parts = ["en", NOTE_FR[note]];
    if (acc) parts.push(acc === "flat" ? "bémol" : "dièse");
    if (mode) parts.push(mode === "major" ? "majeur" : "mineur");
    return parts.join(" ");
  });
}

/** Titre Open Opus en français pour les cas courants ; le reste (op., BWV, K., surnoms) est conservé. */
export function translateTitle(title: string): string {
  let out = title.replace(/\s+/g, " ").trim();
  for (const [pattern, fr] of FORMS) out = out.replace(pattern, fr);
  out = translateKey(out);
  return out
    .replace(/\b(no|No)\. ?/g, "nº ")
    .replace(/ and /g, " et ")
    .replace(/\s+,/g, ",")
    .trim();
}

/* ---------------------------------------------------------------------------
 * Requête : français → termes anglais compris par Open Opus.
 * ------------------------------------------------------------------------- */

const QUERY_WORDS: Record<string, string> = {
  valse: "waltz",
  valses: "waltz",
  prelude: "prelude",
  preludes: "prelude",
  sonate: "sonata",
  sonates: "sonata",
  sonatine: "sonatina",
  sonatines: "sonatina",
  etude: "etude",
  etudes: "etude",
  menuet: "minuet",
  menuets: "minuet",
  fantaisie: "fantasy",
  romance: "song",
  gymnopedie: "gymnopedie",
  gymnopedies: "gymnopedie",
  majeur: "major",
  mineur: "minor",
  bemol: "flat",
  diese: "sharp",
  la: "a",
  si: "b",
  do: "c",
  ut: "c",
  re: "d",
  mi: "e",
  fa: "f",
  sol: "g",
};
const DROPPED = new Set(["en", "pour", "piano", "de", "des", "du", "le", "les", "op", "no"]);
const NOTES = new Set(["la", "si", "do", "ut", "re", "mi", "fa", "sol"]);

function strip(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * « chopin valse en la mineur » → « chopin waltz a minor ». Les noms de notes ne sont
 * traduits que s'ils sont suivis d'une altération ou d'un mode (sinon « la » reste un article).
 */
export function translateQuery(query: string): string {
  const words = strip(query)
    .replace(/[^a-z0-9.'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out: string[] = [];
  words.forEach((word, i) => {
    const next = words[i + 1];
    if (NOTES.has(word)) {
      if (next && ["majeur", "mineur", "bemol", "diese"].includes(next)) out.push(QUERY_WORDS[word]);
      return;
    }
    if (DROPPED.has(word)) return;
    out.push(QUERY_WORDS[word] ?? word);
  });
  return out.join(" ").slice(0, 120);
}

/* ---------------------------------------------------------------------------
 * Partition : lien de recherche IMSLP (l'utilisateur choisit l'édition et vérifie les droits).
 * ------------------------------------------------------------------------- */

export function imslpSearchUrl(composer: string, originalTitle: string): string {
  const lastName = composer.trim().split(/\s+/).pop() ?? "";
  const title = originalTitle.replace(/["“”]/g, "").replace(/\s+/g, " ").trim();
  return `https://imslp.org/wiki/Special:Search?search=${encodeURIComponent(`${lastName} ${title}`.trim())}`;
}

export function isImslpUrl(url: string | null | undefined): boolean {
  return Boolean(url && /^https:\/\/imslp\.org\//.test(url));
}

/* ---------------------------------------------------------------------------
 * Résultats normalisés.
 * ------------------------------------------------------------------------- */

export interface FoundWork {
  id: string;
  /** Titre original (anglais), utile pour la recherche de partition. */
  originalTitle: string;
  title: string;
  composer: string;
  composerId: string;
  period: Period | null;
  /** « 1810–1849 » */
  lifespan: string;
  popular: boolean;
}

export interface FoundComposer {
  id: string;
  name: string;
  period: Period | null;
  lifespan: string;
}

export function lifespan(birth: string | null | undefined, death: string | null | undefined): string {
  const b = birth?.slice(0, 4);
  const d = death?.slice(0, 4);
  return b ? `${b}–${d ?? ""}` : "";
}

/** Œuvres populaires d'abord, puis ordre alphabétique (déterministe), sans doublon de titre. */
export function sortWorks(works: readonly FoundWork[]): FoundWork[] {
  const seen = new Set<string>();
  return [...works]
    .sort((a, b) => Number(b.popular) - Number(a.popular) || a.title.localeCompare(b.title, "fr") || a.id.localeCompare(b.id))
    .filter((w) => {
      const key = `${w.composerId}|${w.originalTitle}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Paramètres d'URL pour pré-remplir le formulaire d'ajout après « Choisir ». */
export function prefillParams(work: FoundWork): URLSearchParams {
  const params = new URLSearchParams({
    titre: work.title,
    compositeur: work.composer,
    partition: imslpSearchUrl(work.composer, work.originalTitle),
  });
  if (work.period) params.set("genre", work.period);
  return params;
}
