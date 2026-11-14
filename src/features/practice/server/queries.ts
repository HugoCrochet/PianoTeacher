import "server-only";
import type { IsoDate } from "@/lib/dates";
import type { Domain } from "@/lib/domain/domains";
import { effectiveKey } from "@/lib/domain/keys";
import type { ServerClient } from "@/lib/supabase/server";
import { improvisationPrompt, type ImprovisationPrompt } from "../domain/improvisation";

export interface TaskView {
  id: string;
  date: IsoDate;
  position: number;
  domain: Domain;
  title: string;
  detail: string;
  objective: string;
  instructions: string;
  href: string;
  plannedMinutes: number;
  targetBpm: number | null;
  reason: string;
  status: "planned" | "done" | "skipped";
  isUserModified: boolean;
  exerciseId: string | null;
  exerciseSlug: string | null;
  exerciseLevel: number | null;
  pieceId: string | null;
  /** Tonalité imposée par le planner (exercice transposable), sinon celle de l'exercice. */
  keySignature: string | null;
  passageLabel: string | null;
  /** Variante du jour pour un exercice d'improvisation. */
  improvisation: ImprovisationPrompt | null;
}

const TASK_COLUMNS = `
  id, task_date, position, domain, planned_minutes, target_bpm, reason, status, is_user_modified,
  exercise_id, user_repertoire_id, key_signature,
  exercise:exercises ( slug, title, level, objective, instructions, key_signature, key_mode ),
  piece:user_repertoire ( id, title, composer, current_step ),
  passage:piece_passages ( label )
` as const;

/** Tâches planifiées entre deux dates (incluses), dans l'ordre. */
export async function getTasks(supabase: ServerClient, from: IsoDate, to: IsoDate = from): Promise<TaskView[]> {
  const { data, error } = await supabase
    .from("planned_tasks")
    .select(TASK_COLUMNS)
    .gte("task_date", from)
    .lte("task_date", to)
    .order("task_date")
    .order("position");
  if (error) throw new Error(`Chargement des tâches impossible : ${error.message}`);
  return data.map((t) => {
    const improvisation =
      t.domain === "improvisation" && t.exercise ? improvisationPrompt(t.task_date, t.exercise.slug, t.exercise.level) : null;
    const key =
      improvisation?.key ??
      t.key_signature ??
      t.exercise?.key_signature ??
      (t.exercise?.key_mode ? "tonalité au choix" : null);
    const passage = t.passage?.label ?? null;
    return {
      id: t.id,
      date: t.task_date,
      position: t.position,
      domain: t.domain as Domain,
      title: t.exercise?.title ?? t.piece?.title ?? "Tâche",
      detail: t.exercise
        ? (key ?? "")
        : [t.piece?.composer, passage ?? t.piece?.current_step].filter(Boolean).join(", "),
      objective:
        t.exercise?.objective ??
        (passage ? `Passage : ${passage}` : t.piece?.current_step ? `Étape en cours : ${t.piece.current_step}` : ""),
      instructions:
        t.exercise?.instructions ??
        "Travaille lentement le passage en cours, mains séparées si besoin, puis assemble. Termine en jouant ce que tu sais déjà pour le plaisir.",
      href: t.exercise ? `/exercices/${t.exercise.slug}` : `/repertoire/${t.piece?.id ?? ""}`,
      plannedMinutes: t.planned_minutes,
      targetBpm: t.target_bpm,
      reason: t.reason,
      status: t.status as TaskView["status"],
      isUserModified: t.is_user_modified,
      exerciseId: t.exercise_id,
      exerciseSlug: t.exercise?.slug ?? null,
      exerciseLevel: t.exercise?.level ?? null,
      pieceId: t.user_repertoire_id,
      keySignature: key,
      passageLabel: passage,
      improvisation,
    };
  });
}

export interface SessionView {
  id: string;
  status: "in_progress" | "completed";
  actualMinutes: number;
}

export async function getSession(supabase: ServerClient, date: IsoDate): Promise<SessionView | null> {
  const { data } = await supabase
    .from("practice_sessions")
    .select("id, status, actual_minutes")
    .eq("session_date", date)
    .maybeSingle();
  return data ? { id: data.id, status: data.status as SessionView["status"], actualMinutes: data.actual_minutes } : null;
}

export interface LogView {
  id: string;
  date: IsoDate;
  practicedAt: string;
  domain: Domain;
  title: string;
  minutes: number;
  bpm: number | null;
  result: "success" | "retry";
  exerciseId: string | null;
  pieceId: string | null;
  passageId: string | null;
  /** Tonalité travaillée en gammes et harmonie, sinon null. */
  key: string | null;
}

const LOG_COLUMNS =
  "id, practice_date, practiced_at, domain, actual_minutes, bpm, result, exercise_id, user_repertoire_id, passage_id, key_signature, exercise:exercises ( title, key_signature ), piece:user_repertoire ( title )";
const PAGE_SIZE = 1000;

/** Résultats réellement enregistrés depuis `from` (ordre chronologique par date de pratique), lus par pages de 1000. */
export async function getLogs(supabase: ServerClient, from: IsoDate = "1970-01-01"): Promise<LogView[]> {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("practice_logs")
      .select(LOG_COLUMNS)
      .gte("practice_date", from)
      .order("practice_date", { ascending: true })
      .order("practiced_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Chargement de l'historique impossible : ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows.map((l) => ({
    id: l.id,
    date: l.practice_date,
    practicedAt: l.practiced_at,
    domain: l.domain as Domain,
    title: l.exercise?.title ?? l.piece?.title ?? "—",
    minutes: l.actual_minutes,
    bpm: l.bpm,
    result: l.result as LogView["result"],
    exerciseId: l.exercise_id,
    pieceId: l.user_repertoire_id,
    passageId: l.passage_id,
    key: effectiveKey(l.domain, l.key_signature, l.exercise?.key_signature ?? null),
  }));
}
