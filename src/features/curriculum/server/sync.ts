import "server-only";
import type { CompetencyStatus } from "@/lib/domain/domains";
import type { ServerClient } from "@/lib/supabase/server";
import { competencyStatus, type CompetencyLog } from "../domain/competency-status";

/** Recalcule le statut de chaque compétence à partir des résultats réels. */
export async function syncCompetencies(supabase: ServerClient, userId: string): Promise<void> {
  const [links, logs] = await Promise.all([
    supabase.from("exercise_competencies").select("exercise_id, competency_id"),
    supabase
      .from("practice_logs")
      .select("exercise_id, practice_date, practiced_at, result")
      .not("exercise_id", "is", null)
      .order("practiced_at", { ascending: true }),
  ]);
  if (links.error || logs.error) return;

  const competenciesByExercise = new Map<string, string[]>();
  for (const link of links.data) {
    competenciesByExercise.set(link.exercise_id, [
      ...(competenciesByExercise.get(link.exercise_id) ?? []),
      link.competency_id,
    ]);
  }

  // Les logs sont parcourus dans l'ordre chronologique : chaque compétence reçoit les siens dans l'ordre.
  const byCompetency = new Map<string, { logs: CompetencyLog[]; last: string }>();
  for (const log of logs.data) {
    for (const competencyId of competenciesByExercise.get(log.exercise_id ?? "") ?? []) {
      const entry = byCompetency.get(competencyId) ?? { logs: [], last: log.practiced_at };
      entry.logs.push({ result: log.result as CompetencyLog["result"], date: log.practice_date });
      entry.last = log.practiced_at;
      byCompetency.set(competencyId, entry);
    }
  }

  const rows = [...byCompetency.entries()].map(([competencyId, entry]) => ({
    user_id: userId,
    competency_id: competencyId,
    status: competencyStatus(entry.logs) satisfies CompetencyStatus,
    last_practiced_at: entry.last,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length > 0) {
    await supabase.from("user_competencies").upsert(rows, { onConflict: "user_id,competency_id" });
  }
}
