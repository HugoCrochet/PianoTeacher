"use server";

import { revalidatePath } from "next/cache";
import { done, fail, type ActionState } from "@/lib/action";
import { weekStartOf } from "@/lib/dates";
import {
  addExerciseSchema,
  firstError,
  moveTaskSchema,
  regenerateSchema,
  replaceTaskSchema,
  taskIdSchema,
} from "@/lib/validation/schemas";
import { getContext, type AppContext } from "@/features/profile/server/profile";
import { ensureWeekPlan, regenerateWeek } from "./plan-service";

async function nextPosition(ctx: AppContext, date: string): Promise<number> {
  const last = await ctx.supabase
    .from("planned_tasks")
    .select("position")
    .eq("task_date", date)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (last.data?.position ?? 0) + 1;
}

export async function removeTask(formData: FormData): Promise<void> {
  const parsed = taskIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { supabase } = await getContext();
  const task = await supabase.from("planned_tasks").select("id, task_date").eq("id", parsed.data.taskId).maybeSingle();
  if (!task.data) return;
  await supabase.from("planned_tasks").delete().eq("id", task.data.id).eq("status", "planned");
  // Le jour est marqué « modifié à la main » pour ne pas être regénéré en silence.
  await supabase.from("planned_tasks").update({ is_user_modified: true }).eq("task_date", task.data.task_date);
  revalidatePath("/", "layout");
}

export async function moveTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = moveTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const ctx = await getContext();
  const { taskId, date } = parsed.data;
  if (date < ctx.today) return fail("Impossible de déplacer une tâche dans le passé.");
  const task = await ctx.supabase.from("planned_tasks").select("id, status, task_date").eq("id", taskId).maybeSingle();
  if (!task.data || task.data.status !== "planned") return fail("Cette tâche ne peut plus être déplacée.");
  if (task.data.task_date === date) return done("La tâche est déjà prévue ce jour-là.");

  const planId = await ensureWeekPlan(ctx, weekStartOf(date));
  if (!planId) return fail();
  const { error } = await ctx.supabase
    .from("planned_tasks")
    .update({ task_date: date, plan_id: planId, position: await nextPosition(ctx, date), is_user_modified: true })
    .eq("id", taskId);
  if (error) return fail();
  revalidatePath("/", "layout");
  return done("Tâche déplacée.");
}

export async function replaceTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = replaceTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const { supabase } = await getContext();
  const [task, exercise] = await Promise.all([
    supabase.from("planned_tasks").select("id, status").eq("id", parsed.data.taskId).maybeSingle(),
    supabase.from("exercises").select("id, domain, bpm_target").eq("id", parsed.data.exerciseId).maybeSingle(),
  ]);
  if (!task.data || task.data.status !== "planned") return fail("Cette tâche ne peut plus être remplacée.");
  if (!exercise.data) return fail("Exercice introuvable.");
  const { error } = await supabase
    .from("planned_tasks")
    .update({
      exercise_id: exercise.data.id,
      user_repertoire_id: null,
      passage_id: null,
      key_signature: null,
      domain: exercise.data.domain,
      target_bpm: exercise.data.bpm_target,
      reason: "choisi par toi",
      is_user_modified: true,
    })
    .eq("id", task.data.id);
  if (error) return fail();
  revalidatePath("/", "layout");
  return done("Tâche remplacée.");
}

export async function addExerciseToPlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = addExerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const ctx = await getContext();
  const { exerciseId, date } = parsed.data;
  if (date < ctx.today) return fail("Choisis aujourd'hui ou une date à venir.");
  const exercise = await ctx.supabase
    .from("exercises")
    .select("id, domain, estimated_minutes, bpm_target")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!exercise.data) return fail("Exercice introuvable.");
  const planId = await ensureWeekPlan(ctx, weekStartOf(date));
  if (!planId) return fail();
  const { error } = await ctx.supabase.from("planned_tasks").insert({
    plan_id: planId,
    user_id: ctx.user.id,
    task_date: date,
    position: await nextPosition(ctx, date),
    domain: exercise.data.domain,
    exercise_id: exercise.data.id,
    planned_minutes: exercise.data.estimated_minutes,
    target_bpm: exercise.data.bpm_target,
    reason: "ajouté par toi",
    is_user_modified: true,
  });
  if (error) return fail();
  revalidatePath("/", "layout");
  return done("Ajouté au programme.");
}

export async function regeneratePlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = regenerateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const ctx = await getContext();
  const { weekStart, overwrite } = parsed.data;
  if (weekStart !== weekStartOf(weekStart)) return fail("Semaine invalide.");
  if (weekStart < weekStartOf(ctx.today)) return fail("Une semaine passée ne peut pas être regénérée.");
  try {
    await regenerateWeek(ctx, weekStart, { overwriteManual: overwrite });
  } catch {
    return fail();
  }
  revalidatePath("/", "layout");
  return done(overwrite ? "Programme regénéré, modifications manuelles remplacées." : "Programme regénéré, tes modifications sont conservées.");
}
