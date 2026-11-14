import type { CompetencyStatus, PracticeResult } from "@/lib/domain/domains";

export interface CompetencyLog {
  result: PracticeResult;
  /** Date calendaire de pratique (YYYY-MM-DD). */
  date: string;
}

/**
 * Statut d'une compétence d'après les résultats des exercices qui la travaillent
 * (ordre chronologique). Jamais « acquise » sur une seule réussite (PRODUCT.md §6.7).
 */
export function competencyStatus(logs: readonly CompetencyLog[]): CompetencyStatus {
  if (logs.length === 0) return "upcoming";
  const successes = logs.filter((l) => l.result === "success");
  const successDays = new Set(successes.map((l) => l.date)).size;
  const lastThreeOk = logs.length >= 3 && logs.slice(-3).every((l) => l.result === "success");
  if (successes.length >= 5 && successDays >= 3 && lastThreeOk) return "acquired";
  if (successes.length >= 3 && successDays >= 2) return "consolidating";
  return "learning";
}

export interface LevelProgress {
  level: number;
  done: number;
  total: number;
  percent: number;
}

/** Niveau en cours d'un domaine : premier niveau dont toutes les compétences ne sont pas acquises. */
export function currentLevel(
  competencies: readonly { level: number; status: CompetencyStatus }[],
): LevelProgress | null {
  if (competencies.length === 0) return null;
  const levels = [...new Set(competencies.map((c) => c.level))].sort((a, b) => a - b);
  const level = levels.find((l) => competencies.some((c) => c.level === l && c.status !== "acquired")) ?? levels[levels.length - 1];
  const inLevel = competencies.filter((c) => c.level === level);
  const score = inLevel.reduce(
    (sum, c) => sum + (c.status === "acquired" ? 1 : c.status === "consolidating" ? 0.66 : c.status === "learning" ? 0.33 : 0),
    0,
  );
  return {
    level,
    done: inLevel.filter((c) => c.status === "acquired").length,
    total: inLevel.length,
    percent: Math.round((score / inLevel.length) * 100),
  };
}

/** Seuils de « Acquise » (mêmes règles que `competencyStatus`). */
export const ACQUIRED_SUCCESSES = 5;
export const ACQUIRED_DAYS = 3;
export const ACQUIRED_STREAK = 3;

export interface AcquisitionStep {
  label: string;
  current: number;
  target: number;
  done: boolean;
}

/** Ce qui reste à faire pour qu'une compétence devienne « Acquise », critère par critère. */
export function acquisitionSteps(logs: readonly CompetencyLog[]): AcquisitionStep[] {
  const successes = logs.filter((l) => l.result === "success");
  const days = new Set(successes.map((l) => l.date)).size;
  let streak = 0;
  for (let i = logs.length - 1; i >= 0 && logs[i].result === "success"; i -= 1) streak += 1;
  const step = (label: string, current: number, target: number): AcquisitionStep => ({
    label,
    current: Math.min(current, target),
    target,
    done: current >= target,
  });
  return [
    step("Réussites au total", successes.length, ACQUIRED_SUCCESSES),
    step("Jours différents avec une réussite", days, ACQUIRED_DAYS),
    step("Réussites d’affilée, les plus récentes", streak, ACQUIRED_STREAK),
  ];
}

/** Résumé en une phrase de ce qui manque (vide si la compétence est acquise). */
export function acquisitionSummary(steps: readonly AcquisitionStep[]): string {
  const [total, days, streak] = steps;
  const parts: string[] = [];
  if (!total.done) {
    const n = total.target - total.current;
    parts.push(`${n} réussite${n > 1 ? "s" : ""} de plus`);
  }
  if (!days.done) {
    const n = days.target - days.current;
    parts.push(`sur ${n} jour${n > 1 ? "s" : ""} de plus`);
  }
  if (!streak.done) parts.push(`dont les ${streak.target} dernières d’affilée`);
  return parts.length === 0 ? "" : `Encore ${parts.join(", ")}.`;
}
