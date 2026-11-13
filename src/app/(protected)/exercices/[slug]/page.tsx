import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Piano } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { BackLink, List, PageHead, Row, Screen, SectionTitle } from "@/components/layout/page";
import { Label, Select } from "@/components/ui/field";
import { addDays, formatLongDate, formatShortDate } from "@/lib/dates";
import {
  DOMAIN_LABEL,
  RESULT_LABEL,
  SOURCE_LABEL,
  type ExerciseDomain,
  type PracticeResult,
  type SourceType,
} from "@/lib/domain/domains";
import { addExerciseToPlan } from "@/features/planner/server/actions";
import { bpmProgress, SUCCESSES_TO_RAISE } from "@/features/practice/domain/bpm";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Exercice" };

export default async function ExercisePage({ params }: PageProps<"/exercices/[slug]">) {
  const { slug } = await params;
  const { supabase, today } = await getContext();
  const { data: exercise } = await supabase
    .from("exercises")
    .select("*, links:exercise_competencies ( competency:competencies ( name ) )")
    .eq("slug", slug)
    .maybeSingle();
  if (!exercise) notFound();

  const logs = await supabase
    .from("practice_logs")
    .select("id, practice_date, bpm, result")
    .eq("exercise_id", exercise.id)
    .order("practiced_at", { ascending: true });
  const history = (logs.data ?? []).map((l) => ({ ...l, result: l.result as PracticeResult }));
  const bpm = bpmProgress(exercise.bpm_target, exercise.bpm_increment, history);
  const competencies = exercise.links.flatMap((l) => (l.competency ? [l.competency.name] : []));
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  return (
    <Screen>
      <BackLink href="/exercices" label="Exercices" />
      <PageHead
        icon={Piano}
        tint="peach"
        title={exercise.title}
        subtitle={[
          DOMAIN_LABEL[exercise.domain as ExerciseDomain],
          `niveau ${exercise.level}`,
          `${exercise.estimated_minutes} min`,
          exercise.key_signature,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="max-w-[760px] space-y-3 text-lg">
        <p>
          <span className="text-ink-2">Objectif : </span>
          {exercise.objective}
        </p>
        <p>{exercise.instructions}</p>
        {bpm.target !== null ? (
          <p>
            <span className="text-ink-2">Tempo visé : </span>
            {bpm.target} BPM
            <span className="block text-[15px] text-ink-2">
              {bpm.streak} réussite{bpm.streak > 1 ? "s" : ""} sur {SUCCESSES_TO_RAISE} à ce tempo avant de passer à{" "}
              {Math.min(300, bpm.target + exercise.bpm_increment)} BPM.
            </span>
          </p>
        ) : null}
        {competencies.length > 0 ? (
          <p>
            <span className="text-ink-2">Compétences travaillées : </span>
            {competencies.join(", ")}
          </p>
        ) : null}
        <p className="text-[15px] text-ink-2">
          Provenance : {SOURCE_LABEL[exercise.source_type as SourceType]}
          {exercise.source_url ? (
            <>
              {" · "}
              <a href={exercise.source_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                Voir la ressource (nouvel onglet)
              </a>
            </>
          ) : null}
        </p>
      </div>

      <ActionForm action={addExerciseToPlan} className="mt-7 max-w-[760px]">
        <input type="hidden" name="exerciseId" value={exercise.id} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Label htmlFor="date">Jour</Label>
            <Select id="date" name="date" defaultValue={today}>
              {dates.map((d, i) => (
                <option key={d} value={d}>
                  {i === 0 ? "Aujourd’hui" : i === 1 ? "Demain" : formatLongDate(d)}
                </option>
              ))}
            </Select>
          </div>
          <SubmitButton size="md" pendingLabel="Ajout…">
            Ajouter au programme
          </SubmitButton>
        </div>
      </ActionForm>

      <SectionTitle>Historique</SectionTitle>
      {history.length === 0 ? (
        <p className="text-[17px] text-ink-2">Pas encore travaillé.</p>
      ) : (
        <List>
          {history
            .slice(-10)
            .reverse()
            .map((l) => (
              <Row
                key={l.id}
                main={RESULT_LABEL[l.result]}
                detail={formatShortDate(l.practice_date)}
                meta={l.bpm ? `${l.bpm} BPM` : "—"}
              />
            ))}
        </List>
      )}
    </Screen>
  );
}
