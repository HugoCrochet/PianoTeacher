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
