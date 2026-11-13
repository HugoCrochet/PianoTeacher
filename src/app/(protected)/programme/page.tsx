import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { BackLink, PageHead, Row, Screen, SectionTitle } from "@/components/layout/page";
import { Label, Select } from "@/components/ui/field";
import {
  addDays,
  formatShortDate,
  formatWeekdayLong,
  isIsoDate,
  weekDates,
  weekStartOf,
  type IsoDate,
} from "@/lib/dates";
import { DOMAIN_LABEL } from "@/lib/domain/domains";
import { minutesForDate } from "@/features/planner/domain/build-plan";
import { moveTask, regeneratePlan, removeTask, replaceTask } from "@/features/planner/server/actions";
import { ensureWeekPlan } from "@/features/planner/server/plan-service";
import { getTasks, type TaskView } from "@/features/practice/server/queries";
import { taskMeta } from "@/features/practice/task-list";
import { getContext, plannerSettings } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Programme" };

function dayState(date: IsoDate, today: IsoDate, tasks: TaskView[]): string {
  if (tasks.length === 0) return date < today ? "pas de séance" : "repos";
  const open = tasks.filter((t) => t.status === "planned").length;
  if (open === 0) return "terminé";
  if (date < today) return "non pratiqué, sans report";
  return open < tasks.length ? "en cours" : date === today ? "aujourd’hui" : "à venir";
}

export default async function ProgrammePage({ searchParams }: PageProps<"/programme">) {
  const ctx = await getContext();
  const { supabase, today, profile } = ctx;
  const param = (await searchParams).semaine;
  const requested = typeof param === "string" && isIsoDate(param) ? weekStartOf(param) : weekStartOf(today);
  const weekStart = requested;
  await ensureWeekPlan(ctx, weekStart);

  const dates = weekDates(weekStart);
  const [tasks, exercises] = await Promise.all([
    getTasks(supabase, weekStart, dates[6]),
    supabase.from("exercises").select("id, title, domain").order("title"),
  ]);
  const editableDates = dates.filter((d) => d >= today);
  const hasManual = tasks.some((t) => t.isUserModified && t.status === "planned" && t.date >= today);
  const isPast = dates[6] < today;

  return (
    <Screen>
      <BackLink href="/aujourdhui" label="Aujourd’hui" />
      <PageHead
        icon={CalendarDays}
        tint="mint"
        title="Programme"
        subtitle={`Semaine du ${formatShortDate(weekStart)} au ${formatShortDate(dates[6])}.`}
      />

      <nav aria-label="Semaines" className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-[17px] text-ink-2">
        <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`/programme?semaine=${addDays(weekStart, -7)}`}>
          ← Semaine précédente
        </Link>
        {weekStart !== weekStartOf(today) ? (
          <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/programme">
            Cette semaine
          </Link>
        ) : null}
        <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`/programme?semaine=${addDays(weekStart, 7)}`}>
          Semaine suivante →
        </Link>
      </nav>

      {dates.map((date) => {
        const dayTasks = tasks.filter((t) => t.date === date);
        const minutes = dayTasks.reduce((s, t) => s + t.plannedMinutes, 0);
        const target = minutesForDate(date, plannerSettings(profile));
        return (
          <section key={date} aria-labelledby={`jour-${date}`}>
            <SectionTitle>
              <span id={`jour-${date}`} className="capitalize">
                {formatWeekdayLong(date)}
              </span>{" "}
              <span className="text-[17px] font-normal text-ink-2">
                {formatShortDate(date)} · {minutes > 0 ? `${minutes} min` : "—"} · {dayState(date, today, dayTasks)}
                {minutes > target && target > 0 ? ` · dépasse ta durée de ${target} min` : ""}
              </span>
            </SectionTitle>
            {dayTasks.length > 0 ? (
              <ol className="max-w-[760px] list-none border-t-[1.5px] border-line">
                {dayTasks.map((task, i) => {
                  const editable = task.status === "planned" && task.date >= today;
                  const sameDomain = (exercises.data ?? []).filter(
                    (e) => e.domain === task.domain && e.id !== task.exerciseId,
                  );
                  return (
                    <Row
                      key={task.id}
                      n={i + 1}
                      done={task.status !== "planned"}
                      main={task.title}
                      detail={
                        <>
                          {task.domain === "repertoire" ? "Répertoire" : DOMAIN_LABEL[task.domain]}
                          {task.detail ? ` · ${task.detail}` : ""}
                          <span className="block">
                            Pourquoi : {task.reason}
                            {task.isUserModified ? " · modifié par toi" : ""}
                          </span>
                        </>
                      }
                      meta={taskMeta(task)}
                    >
                      {editable ? (
                        <details className="mt-2 ml-[46px]">
                          <summary className="inline-flex min-h-11 cursor-pointer items-center text-[15px] text-ink-2 underline underline-offset-4">
                            Modifier
                          </summary>
                          <div className="mt-2 space-y-4 pb-2">
                            <ActionForm action={moveTask} className="flex flex-wrap items-end gap-3">
                              <input type="hidden" name="taskId" value={task.id} />
                              <div className="w-56">
                                <Label htmlFor={`date-${task.id}`}>Déplacer au</Label>
                                <Select id={`date-${task.id}`} name="date" defaultValue={task.date}>
                                  {editableDates.map((d) => (
                                    <option key={d} value={d}>
                                      {formatWeekdayLong(d)} {formatShortDate(d)}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <SubmitButton variant="outline" size="md">
                                Déplacer
                              </SubmitButton>
                            </ActionForm>
                            {task.exerciseId && sameDomain.length > 0 ? (
                              <ActionForm action={replaceTask} className="flex flex-wrap items-end gap-3">
                                <input type="hidden" name="taskId" value={task.id} />
                                <div className="w-72 max-w-full">
                                  <Label htmlFor={`ex-${task.id}`}>Remplacer par</Label>
                                  <Select id={`ex-${task.id}`} name="exerciseId">
                                    {sameDomain.map((e) => (
                                      <option key={e.id} value={e.id}>
                                        {e.title}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                <SubmitButton variant="outline" size="md">
                                  Remplacer
                                </SubmitButton>
                              </ActionForm>
                            ) : null}
                            <form action={removeTask}>
                              <input type="hidden" name="taskId" value={task.id} />
                              <SubmitButton variant="danger" size="md">
                                Supprimer du programme
                              </SubmitButton>
                            </form>
                          </div>
                        </details>
                      ) : null}
                    </Row>
                  );
                })}
              </ol>
            ) : null}
          </section>
        );
      })}

      {!isPast ? (
        <section className="mt-10 max-w-[760px]">
          <SectionTitle>Régénérer le programme</SectionTitle>
          <p className="text-[17px] text-ink-2">
            Recalcule les jours à venir d’après tes derniers résultats. Les jours passés ou commencés ne changent
            jamais.
          </p>
          <ActionForm action={regeneratePlan} className="mt-4">
            <input type="hidden" name="weekStart" value={weekStart} />
            {hasManual ? (
              <div className="mb-4 rounded-[20px] border-[1.5px] border-line px-5 py-4">
                <p className="text-[17px]">
                  ⚠ Tu as modifié ce programme à la main. Par défaut, ces jours sont conservés tels quels.
                </p>
                <label className="mt-2 flex min-h-11 items-center gap-3 text-[17px]">
                  <input type="checkbox" name="overwrite" className="size-5 accent-ink" />
                  Remplacer aussi mes modifications
                </label>
              </div>
            ) : null}
            <SubmitButton variant="outline" size="md" pendingLabel="Calcul…">
              Régénérer
            </SubmitButton>
          </ActionForm>
        </section>
      ) : null}
    </Screen>
  );
}
