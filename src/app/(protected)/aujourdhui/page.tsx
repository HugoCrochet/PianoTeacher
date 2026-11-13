import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { SubmitButton } from "@/components/forms/action-form";
import { BackLink, EmptyState, PageHead, Screen } from "@/components/layout/page";
import { formatLongDate, weekStartOf } from "@/lib/dates";
import { ensureWeekPlan } from "@/features/planner/server/plan-service";
import { startSession } from "@/features/practice/server/actions";
import { getSession, getTasks } from "@/features/practice/server/queries";
import { TaskList } from "@/features/practice/task-list";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Aujourd’hui" };

export default async function TodayPage() {
  const ctx = await getContext();
  await ensureWeekPlan(ctx, weekStartOf(ctx.today));
  const [tasks, session] = await Promise.all([getTasks(ctx.supabase, ctx.today), getSession(ctx.supabase, ctx.today)]);
  const remaining = tasks.filter((t) => t.status === "planned");
  const minutes = tasks.reduce((sum, t) => sum + t.plannedMinutes, 0);

  return (
    <Screen>
      <BackLink />
      <PageHead
        icon={Clock}
        tint="mint"
        title="Aujourd’hui"
        subtitle={
          tasks.length === 0
            ? `${formatLongDate(ctx.today)}, pas de séance prévue.`
            : `${minutes} minutes, dans cet ordre.`
        }
      />
      {tasks.length === 0 ? (
        <EmptyState title="Rien de prévu aujourd’hui">
          <p>
            Une journée sans piano ne crée aucun retard. Si l’envie est là, ajoute un exercice depuis{" "}
            <Link href="/exercices" className="underline">
              Exercices
            </Link>
            .
          </p>
        </EmptyState>
      ) : (
        <>
          <TaskList tasks={tasks} />
          {remaining.length > 0 ? (
            <form action={startSession} className="mt-7">
              <SubmitButton pendingLabel="Ouverture…">
                {session ? "Reprendre la séance" : "Commencer la séance"}
              </SubmitButton>
            </form>
          ) : (
            <p role="status" className="mt-7 text-lg">
              ✓ Séance terminée{session ? `, ${session.actualMinutes} minutes de pratique` : ""}. Bravo !
            </p>
          )}
        </>
      )}
      <Link href="/programme" className="mt-6 inline-flex min-h-11 items-center self-start text-[17px] text-ink-2 underline underline-offset-4">
        Voir la semaine
      </Link>
    </Screen>
  );
}
