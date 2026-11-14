import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { SubmitButton } from "@/components/forms/action-form";
import { BackLink, EmptyState, PageHead, Screen } from "@/components/layout/page";
import { buttonVariants } from "@/components/ui/button";
import { DOMAIN_LABEL } from "@/lib/domain/domains";
import { SessionDesk } from "@/features/practice/session-desk";
import { SessionStage } from "@/features/practice/session-stage";
import { finishSession, skipTask } from "@/features/practice/server/actions";
import { getLogs, getTasks } from "@/features/practice/server/queries";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Séance" };

export default async function SessionPage() {
  const { supabase, today } = await getContext();
  const [tasks, logs] = await Promise.all([getTasks(supabase, today), getLogs(supabase, today)]);
  const current = tasks.find((t) => t.status === "planned");
  const handled = tasks.filter((t) => t.status !== "planned").length;
  const remainingMinutes = tasks.filter((t) => t.status === "planned").reduce((s, t) => s + t.plannedMinutes, 0);

  if (!current) {
    const minutes = logs.reduce((s, l) => s + l.minutes, 0);
    const retry = logs.filter((l) => l.result === "retry").length;
    return (
      <Screen>
        <BackLink href="/aujourdhui" label="Aujourd’hui" />
        <PageHead icon={Clock} tint="mint" title="Séance terminée" subtitle="Bravo, c’est noté." />
        <EmptyState title={logs.length > 0 ? `${minutes} minutes de pratique` : "Aucune tâche à faire"}>
          {logs.length > 0 ? (
            <p>
              {logs.length} {logs.length > 1 ? "tâches enregistrées" : "tâche enregistrée"}
              {retry > 0 ? `, dont ${retry} à retravailler : elles reviendront dans quelques jours.` : "."}
            </p>
          ) : (
            <p>Il n’y a rien de prévu pour le moment.</p>
          )}
        </EmptyState>
        <Link href="/" className={buttonVariants({ className: "mt-7 self-start" })}>
          Retour à l’accueil
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <SessionStage back={<BackLink href="/aujourdhui" label="Aujourd’hui" />}>
        <PageHead
          icon={Clock}
          tint="mint"
          title={current.title}
          subtitle={`${current.domain === "repertoire" ? "Répertoire" : DOMAIN_LABEL[current.domain]} · tâche ${handled + 1} sur ${tasks.length} · environ ${remainingMinutes} min restantes`}
        />

        <div
          className="mb-6 h-2 max-w-[760px] overflow-hidden rounded bg-line"
          role="progressbar"
          aria-label="Avancement de la séance"
          aria-valuemin={0}
          aria-valuemax={tasks.length}
          aria-valuenow={handled}
        >
          <i className="block h-full rounded bg-ink" style={{ width: `${(handled / tasks.length) * 100}%` }} />
        </div>

        <section className="max-w-[760px] space-y-3 text-lg">
          {current.objective ? (
            <p>
              <span className="text-ink-2">Objectif : </span>
              {current.objective}
            </p>
          ) : null}
          <p>{current.instructions}</p>
          <p className="text-[15px] text-ink-2">
            {current.plannedMinutes} min
            {current.targetBpm ? ` · tempo visé : ${current.targetBpm} BPM` : ""}
            {current.detail ? ` · ${current.detail}` : ""} · pourquoi : {current.reason}
          </p>
        </section>

        <SessionDesk
          key={current.id}
          taskId={current.id}
          plannedMinutes={current.plannedMinutes}
          targetBpm={current.targetBpm}
          showBpm={current.targetBpm !== null || current.domain === "repertoire"}
        />

        <div className="mt-8 flex flex-wrap gap-3">
          <form action={skipTask}>
            <input type="hidden" name="taskId" value={current.id} />
            <SubmitButton variant="outline" size="md" pendingLabel="…">
              Passer
            </SubmitButton>
          </form>
          <form action={finishSession}>
            <SubmitButton variant="ghost" size="md" pendingLabel="…">
              Terminer la séance
            </SubmitButton>
          </form>
        </div>
      </SessionStage>
    </Screen>
  );
}
