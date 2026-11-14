import type { KeyStatus } from "@/lib/domain/keys";

/**
 * Tirage aléatoire d'une tonalité et d'une progression de 3 ou 4 accords pour improviser.
 * Le hasard est injecté (`random`), ce qui rend la fonction testable ; c'est un outil
 * libre, distinct du planner qui, lui, reste déterministe.
 */

export type Mode = "major" | "minor";
export type ModeChoice = Mode | "any";
export type CountChoice = 3 | 4 | "any";

/** Gammes majeures orthographiées, une par tonique (12). */
const MAJOR: Record<string, readonly string[]> = {
  Do: ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"],
  "Ré♭": ["Ré♭", "Mi♭", "Fa", "Sol♭", "La♭", "Si♭", "Do"],
  Ré: ["Ré", "Mi", "Fa♯", "Sol", "La", "Si", "Do♯"],
  "Mi♭": ["Mi♭", "Fa", "Sol", "La♭", "Si♭", "Do", "Ré"],
  Mi: ["Mi", "Fa♯", "Sol♯", "La", "Si", "Do♯", "Ré♯"],
  Fa: ["Fa", "Sol", "La", "Si♭", "Do", "Ré", "Mi"],
  "Sol♭": ["Sol♭", "La♭", "Si♭", "Do♭", "Ré♭", "Mi♭", "Fa"],
  Sol: ["Sol", "La", "Si", "Do", "Ré", "Mi", "Fa♯"],
  "La♭": ["La♭", "Si♭", "Do", "Ré♭", "Mi♭", "Fa", "Sol"],
  La: ["La", "Si", "Do♯", "Ré", "Mi", "Fa♯", "Sol♯"],
  "Si♭": ["Si♭", "Do", "Ré", "Mi♭", "Fa", "Sol", "La"],
  Si: ["Si", "Do♯", "Ré♯", "Mi", "Fa♯", "Sol♯", "La♯"],
};

/** Toniques mineures usuelles et leur relative majeure (la gamme est la même, décalée). */
const MINOR_RELATIVE: Record<string, string> = {
  Do: "Mi♭",
  "Do♯": "Mi",
  Ré: "Fa",
  "Mi♭": "Sol♭",
  Mi: "Sol",
  Fa: "La♭",
  "Fa♯": "La",
  Sol: "Si♭",
  "Sol♯": "Si",
  La: "Do",
  "Si♭": "Ré♭",
  Si: "Ré",
};

export const MAJOR_TONICS = Object.keys(MAJOR);
export const MINOR_TONICS = Object.keys(MINOR_RELATIVE);

export function keyName(tonic: string, mode: Mode): string {
  return `${tonic} ${mode === "major" ? "majeur" : "mineur"}`;
}

/** Les 24 tonalités du tirage, avec leur mode. */
export const DRAW_KEYS: readonly { tonic: string; mode: Mode; key: string }[] = [
  ...MAJOR_TONICS.map((tonic) => ({ tonic, mode: "major" as const, key: keyName(tonic, "major") })),
  ...MINOR_TONICS.map((tonic) => ({ tonic, mode: "minor" as const, key: keyName(tonic, "minor") })),
];

/** Même tonalité, écrite comme dans le cercle des quintes du parcours (`lib/domain/keys`). */
const CIRCLE_SPELLING: Record<string, string> = {
  "Sol♭ majeur": "Fa♯ majeur",
  "Mi♭ mineur": "Ré♯ mineur",
};
export function circleKey(key: string): string {
  return CIRCLE_SPELLING[key] ?? key;
}

/** Sur quoi repose le choix des tonalités du tirage. */
export type PoolBasis = "installed" | "started" | "starter" | "all";

export const POOL_BASIS_LABEL: Record<PoolBasis, string> = {
  installed: "parmi tes tonalités bien installées",
  started: "parmi les tonalités que tu as déjà travaillées (aucune n’est encore bien installée)",
  starter: "en do majeur ou la mineur, pour commencer (aucune tonalité encore travaillée en gammes)",
  all: "parmi les 24 tonalités",
};

/**
 * Tonalités autorisées : celles bien installées (au moins 3 réussites en gammes), sinon
 * celles déjà travaillées, sinon do majeur et la mineur. `explore` ouvre les 24.
 */
export function drawPool(statusOf: (circleKey: string) => KeyStatus, explore: boolean): { keys: string[]; basis: PoolBasis } {
  const all = DRAW_KEYS.map((k) => k.key);
  if (explore) return { keys: all, basis: "all" };
  const installed = all.filter((k) => statusOf(circleKey(k)) === "installed");
  if (installed.length > 0) return { keys: installed, basis: "installed" };
  const started = all.filter((k) => statusOf(circleKey(k)) !== "never");
  if (started.length > 0) return { keys: started, basis: "started" };
  return { keys: ["Do majeur", "La mineur"], basis: "starter" };
}

/** Gamme de la tonalité (mineure naturelle pour le mode mineur). */
export function scaleOf(tonic: string, mode: Mode): readonly string[] {
  if (mode === "major") return MAJOR[tonic] ?? [];
  const relative = MAJOR[MINOR_RELATIVE[tonic] ?? ""];
  return relative ? [...relative.slice(5), ...relative.slice(0, 5)] : [];
}

interface Degree {
  roman: string;
  index: number;
  minor: boolean;
}

/** Accords utilisables pour improviser (sans accords diminués). */
const DEGREES: Record<Mode, readonly Degree[]> = {
  major: [
    { roman: "I", index: 0, minor: false },
    { roman: "ii", index: 1, minor: true },
    { roman: "iii", index: 2, minor: true },
    { roman: "IV", index: 3, minor: false },
    { roman: "V", index: 4, minor: false },
    { roman: "vi", index: 5, minor: true },
  ],
  minor: [
    { roman: "i", index: 0, minor: true },
    { roman: "III", index: 2, minor: false },
    { roman: "iv", index: 3, minor: true },
    // V majeur, comme en mineur harmonique : la sensible donne la direction vers i.
    { roman: "V", index: 4, minor: false },
    { roman: "VI", index: 5, minor: false },
    { roman: "VII", index: 6, minor: false },
  ],
};

export interface Chord {
  roman: string;
  name: string;
}

export interface Draw {
  tonic: string;
  mode: Mode;
  /** « Ré♭ majeur », « Do♯ mineur » */
  key: string;
  scale: readonly string[];
  chords: readonly Chord[];
}

/** Entier dans [0, n[ à partir d'un générateur dans [0, 1[. */
function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function chordName(scale: readonly string[], degree: Degree): string {
  const root = scale[degree.index];
  return degree.minor ? `${root} m` : root;
}

/**
 * Tire une tonalité et une progression : premier accord sur la tonique,
 * jamais deux fois le même accord d'affilée, et le dernier différent du premier
 * pour que la boucle reparte bien.
 */
export function drawProgression(
  random: () => number,
  options: { mode?: ModeChoice; count?: CountChoice; allowedKeys?: readonly string[] } = {},
): Draw {
  // Tonalités candidates : celles autorisées, filtrées par le mode demandé s'il en reste.
  const allowed = DRAW_KEYS.filter((k) => !options.allowedKeys || options.allowedKeys.includes(k.key));
  const pool = allowed.length > 0 ? allowed : DRAW_KEYS;
  const wanted = options.mode && options.mode !== "any" ? pool.filter((k) => k.mode === options.mode) : pool;
  const { tonic, mode } = pick(wanted.length > 0 ? wanted : pool, random);
  const count = options.count && options.count !== "any" ? options.count : random() < 0.5 ? 3 : 4;
  const scale = scaleOf(tonic, mode);
  const degrees = DEGREES[mode];

  const chosen: Degree[] = [degrees[0]];
  while (chosen.length < count) {
    const previous = chosen[chosen.length - 1];
    const last = chosen.length === count - 1;
    const options_ = degrees.filter((d) => d !== previous && !(last && d === degrees[0]));
    chosen.push(pick(options_, random));
  }

  return {
    tonic,
    mode,
    key: keyName(tonic, mode),
    scale,
    chords: chosen.map((d) => ({ roman: d.roman, name: chordName(scale, d) })),
  };
}
