import { CIRCLE, keyAccidentals, keyMode, keysByDifficulty, maxAccidentalsForLevel, type KeyMode } from "@/lib/domain/keys";

/**
 * Variante d'improvisation du jour : tonalité, grille, contrainte rythmique et objectif,
 * tirés de façon déterministe à partir de la date et de l'exercice (même jour → même variante).
 * Fonction pure, sans aléatoire ni IA.
 */

/** Gammes majeures orthographiées ; la relative mineure est la même gamme à partir du 6e degré. */
const MAJOR_SCALES: Record<string, readonly string[]> = {
  "Do majeur": ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"],
  "Sol majeur": ["Sol", "La", "Si", "Do", "Ré", "Mi", "Fa♯"],
  "Ré majeur": ["Ré", "Mi", "Fa♯", "Sol", "La", "Si", "Do♯"],
  "La majeur": ["La", "Si", "Do♯", "Ré", "Mi", "Fa♯", "Sol♯"],
  "Mi majeur": ["Mi", "Fa♯", "Sol♯", "La", "Si", "Do♯", "Ré♯"],
  "Si majeur": ["Si", "Do♯", "Ré♯", "Mi", "Fa♯", "Sol♯", "La♯"],
  "Fa♯ majeur": ["Fa♯", "Sol♯", "La♯", "Si", "Do♯", "Ré♯", "Mi♯"],
  "Ré♭ majeur": ["Ré♭", "Mi♭", "Fa", "Sol♭", "La♭", "Si♭", "Do"],
  "La♭ majeur": ["La♭", "Si♭", "Do", "Ré♭", "Mi♭", "Fa", "Sol"],
  "Mi♭ majeur": ["Mi♭", "Fa", "Sol", "La♭", "Si♭", "Do", "Ré"],
  "Si♭ majeur": ["Si♭", "Do", "Ré", "Mi♭", "Fa", "Sol", "La"],
  "Fa majeur": ["Fa", "Sol", "La", "Si♭", "Do", "Ré", "Mi"],
};

/** Notes de la gamme (mineure naturelle pour une tonalité mineure). */
export function scaleNotes(key: string): readonly string[] {
  if (keyMode(key) === "major") return MAJOR_SCALES[key] ?? [];
  const relative = CIRCLE.find((p) => p.minor === key)?.major;
  const major = relative ? MAJOR_SCALES[relative] : undefined;
  return major ? [...major.slice(5), ...major.slice(0, 5)] : [];
}

type Quality = "" | "m" | "7" | "m7" | "maj7";
interface Chord {
  degree: number;
  quality: Quality;
  roman: string;
}
interface Grid {
  level: number;
  mode: KeyMode;
  chords: readonly Chord[];
}

const c = (roman: string, degree: number, quality: Quality): Chord => ({ roman, degree, quality });
const I = c("I", 0, ""), IV = c("IV", 3, ""), V = c("V", 4, ""), vi = c("vi", 5, "m");
const i_ = c("i", 0, "m"), III = c("III", 2, ""), iv = c("iv", 3, "m"), Vh = c("V", 4, ""), VI = c("VI", 5, ""), VII = c("VII", 6, "");

const GRIDS: readonly Grid[] = [
  { level: 1, mode: "major", chords: [I, V, I, V] },
  { level: 1, mode: "major", chords: [I, IV, I, IV] },
  { level: 1, mode: "minor", chords: [i_, iv, i_, iv] },
  { level: 2, mode: "major", chords: [I, IV, V, I] },
  { level: 2, mode: "major", chords: [I, vi, IV, V] },
  { level: 2, mode: "minor", chords: [i_, iv, Vh, i_] },
  { level: 2, mode: "minor", chords: [i_, VI, VII, i_] },
  { level: 3, mode: "major", chords: [c("ii7", 1, "m7"), c("V7", 4, "7"), c("Imaj7", 0, "maj7"), c("Imaj7", 0, "maj7")] },
  { level: 3, mode: "major", chords: [I, V, vi, IV] },
  { level: 3, mode: "minor", chords: [i_, VI, III, VII] },
];

const RHYTHMS: readonly { level: number; text: string }[] = [
  { level: 1, text: "Seulement des noires et des blanches." },
  { level: 1, text: "Phrases de deux mesures, chacune suivie de deux mesures de silence." },
  { level: 2, text: "Commence chaque phrase sur le 2e temps." },
  { level: 2, text: "Glisse une syncope dans chaque phrase." },
  { level: 2, text: "Au moins une noire pointée – croche par phrase." },
  { level: 3, text: "Alterne une mesure de croches et une mesure de triolets." },
  { level: 3, text: "Phrases de longueurs inégales : trois mesures, puis une." },
];

const GOALS: readonly { level: number; text: string }[] = [
  { level: 1, text: "Termine chaque phrase sur la tonique." },
  { level: 1, text: "Pas plus de trois notes différentes par phrase." },
  { level: 1, text: "Joue une phrase douce, puis la même plus fort." },
  { level: 2, text: "Reprends ton premier motif et varie-le trois fois." },
  { level: 2, text: "Vise une note de l’accord sur chaque premier temps." },
  { level: 2, text: "Fais dialoguer les mains : question à droite, réponse à gauche." },
  { level: 3, text: "Construis un sommet : monte peu à peu vers la note la plus aiguë, puis redescends." },
  { level: 3, text: "Passe par la sensible avant chaque retour à la tonique." },
];

/** Hachage FNV-1a 32 bits : stable d'une machine à l'autre. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(items: readonly T[], seed: string): T {
  return items[hash(seed) % items.length];
}

function chordName(notes: readonly string[], chord: Chord): string {
  const root = notes[chord.degree] ?? "?";
  return chord.quality === "" ? root : `${root} ${chord.quality}`;
}

export interface ImprovisationPrompt {
  key: string;
  /** « Sol | Do | Ré | Sol » */
  grid: string;
  /** « I–IV–V–I » */
  degrees: string;
  rhythm: string;
  goal: string;
}

/**
 * @param date date de la tâche (YYYY-MM-DD)
 * @param exerciseSlug exercice d'improvisation concerné
 * @param level niveau de l'exercice (1 à 3 ; au-delà, traité comme 3)
 */
export function improvisationPrompt(date: string, exerciseSlug: string, level: number): ImprovisationPrompt {
  const lvl = Math.min(3, Math.max(1, Math.round(level)));
  const seed = `${date}|${exerciseSlug}`;
  const grid = pick(GRIDS.filter((g) => g.level <= lvl), `${seed}|grille`);
  const keys = keysByDifficulty(grid.mode).filter((k) => keyAccidentals(k) <= maxAccidentalsForLevel(lvl));
  const key = pick(keys, `${seed}|tonalité`);
  const notes = scaleNotes(key);
  return {
    key,
    grid: grid.chords.map((ch) => chordName(notes, ch)).join(" | "),
    degrees: grid.chords.map((ch) => ch.roman).join("–"),
    rhythm: pick(RHYTHMS.filter((r) => r.level <= lvl), `${seed}|rythme`).text,
    goal: pick(GOALS.filter((g) => g.level <= lvl), `${seed}|objectif`).text,
  };
}
