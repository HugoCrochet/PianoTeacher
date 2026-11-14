/**
 * Calculs purs des outils de séance (minuteur, métronome). Aucune dépendance au navigateur.
 */

export const METRONOME_MIN_BPM = 30;
export const METRONOME_MAX_BPM = 240;
export const METRONOME_DEFAULT_BPM = 60;

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return METRONOME_DEFAULT_BPM;
  return Math.min(METRONOME_MAX_BPM, Math.max(METRONOME_MIN_BPM, Math.round(bpm)));
}

/** Durée d'un temps, en secondes. */
export function beatSeconds(bpm: number): number {
  return 60 / clampBpm(bpm);
}

/** Secondes restantes sur la durée prévue (négatif = dépassement). */
export function remainingSeconds(plannedMinutes: number, elapsedSeconds: number): number {
  return plannedMinutes * 60 - elapsedSeconds;
}

/** « 3:07 » ; un dépassement s'affiche « +0:23 ». */
export function formatClock(seconds: number): string {
  const sign = seconds < 0 ? "+" : "";
  const total = Math.abs(Math.trunc(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

/** Durée réelle à enregistrer : minutes arrondies, au moins 1. */
export function measuredMinutes(elapsedSeconds: number): number {
  return Math.max(1, Math.round(elapsedSeconds / 60));
}
