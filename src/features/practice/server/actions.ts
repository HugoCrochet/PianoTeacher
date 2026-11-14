"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { done, fail, type ActionState } from "@/lib/action";
import { firstError, resultSchema, taskIdSchema } from "@/lib/validation/schemas";
import { syncCompetencies } from "@/features/curriculum/server/sync";
import { refreshUpcoming } from "@/features/planner/server/plan-service";
import { getContext, type AppContext } from "@/features/profile/server/profile";

async function openSession(ctx: AppContext): Promise<string> {
  const { supabase, user, today } = ctx;
  const existing = await supabase.from("practice_sessions").select("id, status").eq("session_date", today).maybeSingle();
  if (existing.data) {
    if (existing.data.status !== "in_progress") {
      await supabase.from("practice_sessions").update({ status: "in_progress", ended_at: null }).eq("id", existing.data.id);
    }
    return existing.data.id;
  }
  const created = await supabase
    .from("practice_sessions")
    .insert({ user_id: user.id, session_date: today })
    .select("id")
    .single();
  if (created.error) throw new Error(`Ouverture de la séance impossible : ${created.error.message}`);
  return created.data.id;
}

async function closeSession(ctx: AppContext): Promise<void> {
  const { supabase, today } = ctx;
  const session = await supabase.from("practice_sessions").select("id").eq("session_date", today).maybeSingle();
  if (!session.data) return;
  const logs = await supabase.from("practice_logs").select("actual_minutes").eq("session_id", session.data.id);
  const minutes = (logs.data ?? []).reduce((sum, l) => sum + l.actual_minutes, 0);
  await supabase
    .from("practice_sessions")
    .update({ status: "completed", ended_at: new Date().toISOString(), actual_minutes: minutes })
    .eq("id", session.data.id);
  // Les jours suivants tiennent compte des résultats du jour (retours espacés, BPM).
  await refreshUpcoming(ctx);
}

export async function startSession(): Promise<void> {
  const ctx = await getContext();
  await openSession(ctx);
  revalidatePath("/", "layout");
  redirect("/aujourdhui/seance");
}

export async function recordResult(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resultSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const { taskId, result, bpm, minutes } = parsed.data;

  const ctx = await getContext();
  const { supabase, user, today } = ctx;
  // La RLS garantit que la tâche appartient à l'utilisateur connecté.
  const task = await supabase
    .from("planned_tasks")
    .select("id, domain, exercise_id, user_repertoire_id, passage_id, key_signature, status, task_date")
    .eq("id", taskId)
    .maybeSingle();
  if (!task.data) return fail("Cette tâche n'existe plus.");
  if (task.data.task_date !== today) return fail("Cette tâche n'est pas prévue aujourd'hui.");
  if (task.data.status === "done") return fail("Cette tâche est déjà enregistrée.");

  try {
    const sessionId = await openSession(ctx);
    const inserted = await supabase.from("practice_logs").insert({
      user_id: user.id,
      session_id: sessionId,
      planned_task_id: task.data.id,
      domain: task.data.domain,
      exercise_id: task.data.exercise_id,
      user_repertoire_id: task.data.user_repertoire_id,
      passage_id: task.data.passage_id,
      key_signature: task.data.key_signature,
      practice_date: today,
      actual_minutes: minutes,
      bpm: bpm ?? null,
      result,
    });
    if (inserted.error) return fail("Le résultat n'a pas pu être enregistré. Réessaie.");
    await supabase.from("planned_tasks").update({ status: "done" }).eq("id", task.data.id);
    if (task.data.exercise_id) await syncCompetencies(supabase, user.id);

    const remaining = await supabase
      .from("planned_tasks")
      .select("id", { count: "exact", head: true })
      .eq("task_date", today)
      .eq("status", "planned");
    if ((remaining.count ?? 0) === 0) await closeSession(ctx);
  } catch {
    return fail();
  }
  revalidatePath("/", "layout");
  return done("Résultat enregistré.");
}

export async function skipTask(formData: FormData): Promise<void> {
  const parsed = taskIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const ctx = await getContext();
  // Une tâche passée n'est ni un résultat ni une dette : elle est simplement ignorée.
  await ctx.supabase.from("planned_tasks").update({ status: "skipped" }).eq("id", parsed.data.taskId).eq("status", "planned");
  const remaining = await ctx.supabase
    .from("planned_tasks")
    .select("id", { count: "exact", head: true })
    .eq("task_date", ctx.today)
    .eq("status", "planned");
  if ((remaining.count ?? 0) === 0) await closeSession(ctx);
  revalidatePath("/", "layout");
}

export async function finishSession(): Promise<void> {
  const ctx = await getContext();
  await closeSession(ctx);
  revalidatePath("/", "layout");
  redirect("/aujourdhui");
}
