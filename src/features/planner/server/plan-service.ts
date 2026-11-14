import "server-only";
import { addDays, weekStartOf, type IsoDate } from "@/lib/dates";
import type { CompetencyStatus, ExerciseDomain, PracticeResult, Tier } from "@/lib/domain/domains";
import { plannerSettings, type AppContext } from "@/features/profile/server/profile";
import { effectiveKey, type KeyMode } from "@/lib/domain/keys";
import { buildPlan, PLANNER_VERSION, type PlannerInput } from "../domain/build-plan";

type PlannerData = Pick<PlannerInput, "exercises" | "competencies" | "activePieces" | "logs">;

async function loadPlannerData({ supabase, today }: AppContext): Promise<PlannerData> {
  const [exercises, links, competencies, statuses, pieces, passages, logs] = await Promise.all([
    supabase.from("exercises").select("id, slug, domain, level, bpm_target, bpm_increment, key_mode"),
    supabase.from("exercise_competencies").select("exercise_id, competency_id"),
    supabase.from("competencies").select("id, name"),
    supabase.from("user_competencies").select("competency_id, status"),
    supabase.from("user_repertoire").select("id, title, tier, current_step").eq("status", "active"),
    supabase.from("piece_passages").select("id, user_repertoire_id, position, label, target_bpm").order("position"),
    supabase
      .from("practice_logs")
      .select("exercise_id, user_repertoire_id, passage_id, domain, key_signature, practice_date, result, bpm, exercise:exercises ( key_signature )")
      .gte("practice_date", addDays(today, -180))
      .order("practiced_at", { ascending: true }),
  ]);
  const failed = [exercises, links, competencies, statuses, pieces, passages, logs].find((r) => r.error);
  if (failed?.error) throw new Error(`Chargement du planner impossible : ${failed.error.message}`);

  const statusById = new Map((statuses.data ?? []).map((s) => [s.competency_id, s.status as CompetencyStatus]));
  return {
    exercises: (exercises.data ?? []).map((e) => ({
      id: e.id,
      slug: e.slug,
      domain: e.domain as ExerciseDomain,
      level: e.level,
      bpmTarget: e.bpm_target,
      bpmIncrement: e.bpm_increment,
      competencyIds: (links.data ?? []).filter((l) => l.exercise_id === e.id).map((l) => l.competency_id),
      keyMode: (e.key_mode as KeyMode | null) ?? null,
    })),
    competencies: Object.fromEntries(
      (competencies.data ?? []).map((c) => [c.id, { name: c.name, status: statusById.get(c.id) ?? "upcoming" }]),
    ),
    activePieces: (pieces.data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      tier: p.tier as Tier,
      currentStep: p.current_step,
      passages: (passages.data ?? [])
        .filter((x) => x.user_repertoire_id === p.id)
        .map((x) => ({ id: x.id, position: x.position, label: x.label, targetBpm: x.target_bpm })),
    })),
    logs: (logs.data ?? []).map((l) => ({
      exerciseId: l.exercise_id,
      pieceId: l.user_repertoire_id,
      date: l.practice_date,
      result: l.result as PracticeResult,
      bpm: l.bpm,
      key: effectiveKey(l.domain, l.key_signature, l.exercise?.key_signature ?? null),
      passageId: l.passage_id,
    })),
  };
}

async function insertDrafts(ctx: AppContext, planId: string, input: PlannerInput): Promise<void> {
  const drafts = buildPlan(input);
  if (drafts.length === 0) return;
  const { error } = await ctx.supabase.from("planned_tasks").insert(
    drafts.map((t) => ({
      plan_id: planId,
      user_id: ctx.user.id,
      task_date: t.date,
      position: t.position,
      domain: t.domain,
      exercise_id: t.exerciseId,
      user_repertoire_id: t.pieceId,
      planned_minutes: t.plannedMinutes,
      target_bpm: t.targetBpm,
      reason: t.reason,
      key_signature: t.keySignature,
      passage_id: t.passageId,
    })),
  );
  if (error) throw new Error(`Enregistrement du plan impossible : ${error.message}`);
}

/**
 * Renvoie le plan de la semaine, en le créant s'il n'existe pas encore.
 * Une semaine passée sans plan reste vide : on ne planifie jamais le passé.
 */
export async function ensureWeekPlan(ctx: AppContext, weekStart: IsoDate): Promise<string | null> {
  const { supabase, user, profile, today } = ctx;
  const existing = await supabase.from("practice_plans").select("id").eq("week_start", weekStart).maybeSingle();
  if (existing.data) return existing.data.id;
  if (weekStart < weekStartOf(today)) return null;

  const created = await supabase
    .from("practice_plans")
    .upsert(
      {
        user_id: user.id,
        week_start: weekStart,
        planner_version: PLANNER_VERSION,
        settings_snapshot: plannerSettings(profile) as never,
      },
      { onConflict: "user_id,week_start", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (!created.data) {
    // Une autre requête vient de créer le plan (double chargement) : on le réutilise.
    const again = await supabase.from("practice_plans").select("id").eq("week_start", weekStart).maybeSingle();
    return again.data?.id ?? null;
  }

  const data = await loadPlannerData(ctx);
  await insertDrafts(ctx, created.data.id, {
    weekStart,
    fromDate: weekStart > today ? weekStart : today,
    settings: plannerSettings(profile),
    lockedDates: [],
    ...data,
  });
  return created.data.id;
}

export interface RegenerateOptions {
  /** Première date regénérée (aujourd'hui par défaut). */
  fromDate?: IsoDate;
  /** Remplacer aussi les tâches modifiées à la main — uniquement après confirmation explicite. */
  overwriteManual?: boolean;
}

/**
 * Regénère les jours à venir d'une semaine. Ne touche jamais au passé, aux jours
 * commencés, ni (sauf confirmation) aux jours modifiés à la main.
 */
export async function regenerateWeek(ctx: AppContext, weekStart: IsoDate, options: RegenerateOptions = {}): Promise<void> {
  const { supabase, profile, today } = ctx;
  const planId = await ensureWeekPlan(ctx, weekStart);
  if (!planId) return;
  const earliest = weekStart > today ? weekStart : today;
  const fromDate = options.fromDate && options.fromDate > earliest ? options.fromDate : earliest;

  const tasks = await supabase
    .from("planned_tasks")
    .select("task_date, status, is_user_modified")
    .eq("plan_id", planId)
    .gte("task_date", fromDate);
  if (tasks.error) throw new Error(tasks.error.message);

  const locked = new Set<IsoDate>();
  for (const t of tasks.data) {
    if (t.status !== "planned" || (t.is_user_modified && !options.overwriteManual)) locked.add(t.task_date);
  }

  let removal = supabase.from("planned_tasks").delete().eq("plan_id", planId).eq("status", "planned").gte("task_date", fromDate);
  if (locked.size > 0) removal = removal.not("task_date", "in", `(${[...locked].join(",")})`);
  const removed = await removal;
  if (removed.error) throw new Error(removed.error.message);

  const data = await loadPlannerData(ctx);
  await insertDrafts(ctx, planId, {
    weekStart,
    fromDate,
    settings: plannerSettings(profile),
    lockedDates: [...locked],
    ...data,
  });
  await supabase
    .from("practice_plans")
    .update({
      planner_version: PLANNER_VERSION,
      generated_at: new Date().toISOString(),
      settings_snapshot: plannerSettings(profile) as never,
    })
    .eq("id", planId);
}

/** Après une séance : réajuste les jours suivants (retours « à revoir », BPM), sans toucher au manuel. */
export async function refreshUpcoming(ctx: AppContext): Promise<void> {
  const tomorrow = addDays(ctx.today, 1);
  const weekStart = weekStartOf(ctx.today);
  if (weekStartOf(tomorrow) !== weekStart) return;
  await regenerateWeek(ctx, weekStart, { fromDate: tomorrow });
}
