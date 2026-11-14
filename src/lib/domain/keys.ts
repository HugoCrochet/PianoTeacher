/**
 * Les 24 tonalités (12 majeures + relatives mineures), le cercle des quintes et le choix
 * déterministe de la tonalité du jour. Fonctions pures.
 */

export type KeyMode = "major" | "minor";

export interface CirclePosition {
  /** Position sur le cercle, 0 = do en haut, dans le sens des quintes montantes. */
  index: number;
  major: string;
  minor: string;
  /** Nombre d'altérations à l'armure. */
  accidentals: number;
  /** « 2♯ », « 3♭ », « — ». */
  signature: string;
}

export const CIRCLE: readonly CirclePosition[] = [
  { index: 0, major: "Do majeur", minor: "La mineur", accidentals: 0, signature: "—" },
  { index: 1, major: "Sol majeur", minor: "Mi mineur", accidentals: 1, signature: "1♯" },
  { index: 2, major: "Ré majeur", minor: "Si mineur", accidentals: 2, signature: "2♯" },
  { index: 3, major: "La majeur", minor: "Fa♯ mineur", accidentals: 3, signature: "3♯" },
  { index: 4, major: "Mi majeur", minor: "Do♯ mineur", accidentals: 4, signature: "4♯" },
  { index: 5, major: "Si majeur", minor: "Sol♯ mineur", accidentals: 5, signature: "5♯" },
  { index: 6, major: "Fa♯ majeur", minor: "Ré♯ mineur", accidentals: 6, signature: "6♯" },
  { index: 7, major: "Ré♭ majeur", minor: "Si♭ mineur", accidentals: 5, signature: "5♭" },
  { index: 8, major: "La♭ majeur", minor: "Fa mineur", accidentals: 4, signature: "4♭" },
  { index: 9, major: "Mi♭ majeur", minor: "Do mineur", accidentals: 3, signature: "3♭" },
  { index: 10, major: "Si♭ majeur", minor: "Sol mineur", accidentals: 2, signature: "2♭" },
  { index: 11, major: "Fa majeur", minor: "Ré mineur", accidentals: 1, signature: "1♭" },
];

export const ALL_KEYS: readonly string[] = CIRCLE.flatMap((p) => [p.major, p.minor]);

export function isKey(value: string): boolean {
  return ALL_KEYS.includes(value);
}

/** Tonalité réellement travaillée : imposée par la tâche, sinon celle de l'exercice (gammes et harmonie seulement). */
export function effectiveKey(domain: string, taskKey: string | null, exerciseKey: string | null): string | null {
  if (domain !== "scales_harmony") return null;
  const key = taskKey ?? exerciseKey;
  return key && isKey(key) ? key : null;
}

export function keyMode(key: string): KeyMode {
  return key.endsWith("mineur") ? "minor" : "major";
}

export function keyAccidentals(key: string): number {
  return CIRCLE.find((p) => p.major === key || p.minor === key)?.accidentals ?? 0;
}

/** Tonalités d'un mode, des plus simples aux plus chargées (dièses avant bémols à égalité). */
export function keysByDifficulty(mode: KeyMode): string[] {
  return [...CIRCLE]
    .sort((a, b) => a.accidentals - b.accidentals || a.index - b.index)
    .map((p) => (mode === "major" ? p.major : p.minor));
}

/** Altérations maximales proposées selon le niveau auto-évalué (1 → 2, 2 → 4, 3 et plus → toutes). */
export function maxAccidentalsForLevel(level: number): number {
  return Math.min(6, Math.max(1, level) * 2);
}

export interface KeyLog {
  key: string;
  date: string;
  result: "success" | "retry";
}

export interface KeyCoverage {
  key: string;
  sessions: number;
  successes: number;
  lastDate: string | null;
}

/** Couverture par tonalité, d'après les résultats réels. */
export function keyCoverage(logs: readonly KeyLog[]): Map<string, KeyCoverage> {
  const map = new Map<string, KeyCoverage>(ALL_KEYS.map((k) => [k, { key: k, sessions: 0, successes: 0, lastDate: null }]));
  for (const log of logs) {
    const entry = map.get(log.key);
    if (!entry) continue;
    entry.sessions += 1;
    if (log.result === "success") entry.successes += 1;
    if (!entry.lastDate || log.date > entry.lastDate) entry.lastDate = log.date;
  }
  return map;
}

export interface KeyChoice {
  key: string;
  neverPlayed: boolean;
}

/**
 * Tonalité du jour pour un exercice transposable : d'abord une tonalité jamais jouée
 * (la plus simple), sinon la moins travaillée, puis la plus ancienne.
 * `assigned` compte les tonalités déjà proposées cette semaine, pour faire tourner.
 */
export function chooseKey(
  mode: KeyMode,
  maxAccidentals: number,
  history: readonly KeyLog[],
  assigned: ReadonlyMap<string, number> = new Map(),
): KeyChoice {
  const coverage = keyCoverage(history);
  const candidates = keysByDifficulty(mode).filter((k) => keyAccidentals(k) <= maxAccidentals);
  let best = candidates[0];
  let bestRank: [number, string] = [Number.POSITIVE_INFINITY, ""];
  for (const key of candidates) {
    const c = coverage.get(key);
    const count = (c?.sessions ?? 0) + (assigned.get(key) ?? 0);
    const rank: [number, string] = [count, c?.lastDate ?? ""];
    if (rank[0] < bestRank[0] || (rank[0] === bestRank[0] && rank[1] < bestRank[1])) {
      best = key;
      bestRank = rank;
    }
  }
  return { key: best, neverPlayed: (coverage.get(best)?.sessions ?? 0) === 0 };
}

export type KeyStatus = "never" | "started" | "installed";

export const KEY_STATUS_LABEL: Record<KeyStatus, string> = {
  never: "Jamais jouée",
  started: "Travaillée",
  installed: "Bien installée",
};

/** Bien installée = au moins 3 réussites (jamais sur une seule). */
export function keyStatus(coverage: KeyCoverage | undefined): KeyStatus {
  if (!coverage || coverage.sessions === 0) return "never";
  return coverage.successes >= 3 ? "installed" : "started";
}
