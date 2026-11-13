import type { PracticeResult } from "@/lib/domain/domains";

/** Nombre de réussites consécutives au BPM cible avant d'augmenter la cible (PRODUCT.md §6.6). */
export const SUCCESSES_TO_RAISE = 3;
export const MAX_BPM = 300;

export interface BpmLog {
  result: PracticeResult;
  bpm: number | null;
}

export interface BpmProgress {
  /** Cible actuelle, ou null si l'exercice n'a pas de tempo. */
  target: number | null;
  /** Réussites consécutives à la cible actuelle. */
  streak: number;
  /** Vrai si le dernier résultat vient de faire monter la cible. */
  justRaised: boolean;
}

/**
 * Cible BPM déduite de l'historique (ordre chronologique).
 * Une réussite compte si elle est jouée à la cible ou au-dessus (ou sans BPM saisi).
 * Une réussite sous la cible ou un « à retravailler » remet le compteur à zéro.
 */
export function bpmProgress(baseTarget: number | null, increment: number, logs: readonly BpmLog[]): BpmProgress {
  if (baseTarget === null) return { target: null, streak: 0, justRaised: false };
  let target = baseTarget;
  let streak = 0;
  let justRaised = false;
  for (const log of logs) {
    justRaised = false;
    const atTarget = log.result === "success" && (log.bpm === null || log.bpm >= target);
    streak = atTarget ? streak + 1 : 0;
    if (streak >= SUCCESSES_TO_RAISE && target < MAX_BPM) {
      target = Math.min(MAX_BPM, target + increment);
      streak = 0;
      justRaised = true;
    }
  }
  return { target, streak, justRaised };
}
