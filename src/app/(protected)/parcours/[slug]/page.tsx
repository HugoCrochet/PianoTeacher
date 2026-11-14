import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Route } from "lucide-react";
import { BackLink, List, PageHead, Row, Screen, SectionTitle } from "@/components/layout/page";
import { formatShortDate } from "@/lib/dates";
import {
  COMPETENCY_STATUS_LABEL,
  DOMAIN_LABEL,
  RESULT_LABEL,
  type CompetencyStatus,
  type ExerciseDomain,
  type PracticeResult,
} from "@/lib/domain/domains";
import {
  acquisitionSteps,
  acquisitionSummary,
  competencyStatus,
  type CompetencyLog,
} from "@/features/curriculum/domain/competency-status";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Compétence" };

export default async function CompetencyPage({ params }: PageProps<"/parcours/[slug]">) {
  const { slug } = await params;
  const { supabase } = await getContext();
  const { data: competency } = await supabase
    .from("competencies")
    .select("id, name, domain, level, description, objective, links:exercise_competencies ( exercise:exercises ( id, slug, title, level ) )")
    .eq("slug", slug)
    .maybeSingle();
  if (!competency) notFound();

  const exercises = competency.links
    .flatMap((l) => (l.exercise ? [l.exercise] : []))
    .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title, "fr"));
  const logs =
    exercises.length > 0
      ? await supabase
          .from("practice_logs")
          .select("exercise_id, practice_date, result")
          .in(
            "exercise_id",
            exercises.map((e) => e.id),
          )
          .order("practiced_at", { ascending: true })
      : { data: [], error: null };
  if (logs.error) throw new Error("Chargement des résultats impossible.");

  // Même calcul que la synchronisation des statuts : tous les résultats des exercices liés, dans l'ordre.
  const history: CompetencyLog[] = logs.data.map((l) => ({ result: l.result as PracticeResult, date: l.practice_date }));
  const status: CompetencyStatus = competencyStatus(history);
  const steps = acquisitionSteps(history);
  const summary = acquisitionSummary(steps);
  const lastByExercise = new Map(logs.data.map((l) => [l.exercise_id, l]));

  return (
    <Screen>
      <BackLink href="/parcours" label="Parcours" />
      <PageHead
        icon={Route}
        tint="sky"
        title={competency.name}
        subtitle={`${DOMAIN_LABEL[competency.domain as ExerciseDomain]} · niveau ${competency.level} · ${COMPETENCY_STATUS_LABEL[status]}`}
      />

      <section className="max-w-[760px] space-y-3 text-lg">
        <p>
          <span className="text-ink-2">Objectif : </span>
          {competency.objective || competency.description}
        </p>
        {competency.objective ? <p className="text-[17px] text-ink-2">{competency.description}</p> : null}
      </section>

      <SectionTitle>{status === "acquired" ? "Acquise" : "Pour la valider"}</SectionTitle>
      <p className="mb-4 max-w-[760px] text-[17px] text-ink-2">
        {status === "acquired"
          ? "Bravo, cette compétence est acquise. Elle reviendra de temps en temps en entretien."
          : `${summary} Une compétence n’est jamais acquise sur une seule réussite.`}
      </p>
      <List>
        {steps.map((s) => (
          <Row
            key={s.label}
            main={s.label}
            detail={s.done ? "Fait" : `Encore ${s.target - s.current}`}
            meta={
              <span className={s.done ? "font-bold text-ink" : undefined}>
                {s.done ? "✓ " : ""}
                {s.current} sur {s.target}
              </span>
            }
          />
        ))}
      </List>

      <SectionTitle>Exercices liés</SectionTitle>
      {exercises.length === 0 ? (
        <p className="text-[17px] text-ink-2">Aucun exercice n’entraîne encore cette compétence.</p>
      ) : (
        <List>
          {exercises.map((e) => {
            const last = lastByExercise.get(e.id);
            return (
              <li key={e.id} className="border-b-[1.5px] border-line text-lg">
                <Link href={`/exercices/${e.slug}`} className="flex min-h-11 items-center gap-[18px] px-1 py-[18px]">
                  <span className="min-w-0 flex-1">
                    {e.title}
                    <small className="mt-0.5 block text-[15px] text-ink-2">
                      {last
                        ? `${RESULT_LABEL[last.result as PracticeResult]} le ${formatShortDate(last.practice_date)}`
                        : "Pas encore joué"}
                    </small>
                  </span>
                  <span className="text-base text-ink-2">Niveau {e.level}</span>
                </Link>
              </li>
            );
          })}
        </List>
      )}
    </Screen>
  );
}
