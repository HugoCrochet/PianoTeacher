import type { Metadata } from "next";
import { ChartLine } from "lucide-react";
import { BackLink, EmptyState, List, Panel, PageHead, Row, Screen, SectionTitle } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { addDays, formatMinutes, formatShortDate, formatWeekdayShort, weekStartOf } from "@/lib/dates";
import { COMPETENCY_STATUS_LABEL, DOMAIN_LABEL, RESULT_LABEL, type CompetencyStatus } from "@/lib/domain/domains";
import { cn } from "@/lib/utils";
import { getLogs } from "@/features/practice/server/queries";
import { getContext, plannerSettings } from "@/features/profile/server/profile";
import { minutesForDate } from "@/features/planner/domain/build-plan";
import { DomainWeeks, PracticeCalendar } from "@/features/progress/charts";
import { minutesPerDomainByWeek, practiceCalendar } from "@/features/progress/domain/calendar";
import { milestones } from "@/features/progress/domain/milestones";
import { minutesPerDay, totalMinutes } from "@/features/progress/domain/stats";
import { weeklySummary } from "@/features/progress/domain/weekly-summary";

export const metadata: Metadata = { title: "Progression" };

function BpmChart({ points }: { points: { date: string; bpm: number }[] }) {
  const w = 520;
  const h = 150;
  const pad = 12;
  const values = points.map((p) => p.bpm);
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  const x = (i: number) => (points.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (points.length - 1));
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <figure className="max-w-[520px]">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Tempo de ${first.bpm} à ${last.bpm} BPM sur ${points.length} séances`}
        className="w-full"
      >
        <polyline
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points.map((p, i) => `${x(i)},${y(p.bpm)}`).join(" ")}
        />
        {points.map((p, i) => (
          <circle key={`${p.date}-${i}`} cx={x(i)} cy={y(p.bpm)} r="4" fill="var(--ink)" />
        ))}
      </svg>
      <figcaption className="mt-1 text-[15px] text-ink-2">
        {formatShortDate(first.date)} : {first.bpm} BPM → {formatShortDate(last.date)} : {last.bpm} BPM
      </figcaption>
    </figure>
  );
}

export default async function ProgressPage({ searchParams }: PageProps<"/progression">) {
  const { supabase, today, profile } = await getContext();
  const weekStart = weekStartOf(today);
  const previousStart = addDays(weekStart, -7);
  const [logs, sessions, competencies, catalog, pieces, passages] = await Promise.all([
    getLogs(supabase),
    supabase.from("practice_sessions").select("session_date").gte("session_date", weekStart),
    supabase
      .from("user_competencies")
      .select("status, competency:competencies ( name, domain )")
      .in("status", ["learning", "consolidating"]),
    supabase.from("competencies").select("name, links:exercise_competencies ( exercise_id )"),
    supabase.from("user_repertoire").select("id, title, status, updated_at"),
    supabase.from("piece_passages").select("id, user_repertoire_id"),
  ]);

  const stats = logs.map((l) => ({ date: l.date, minutes: l.minutes, domain: l.domain, result: l.result }));
  const week = stats.filter((l) => l.date >= weekStart);
  const thisWeek = totalMinutes(stats, weekStart, addDays(weekStart, 6));
  const lastWeek = totalMinutes(stats, previousStart, addDays(weekStart, -1));
  const days = minutesPerDay(stats, weekStart);
  const peak = Math.max(1, ...days.map((d) => d.minutes));
  const settings = plannerSettings(profile);
  const calendar = practiceCalendar(stats, today, 12, (date) => minutesForDate(date, settings));
  const domainWeeks = minutesPerDomainByWeek(stats, today, 4);
  const summary = weeklySummary(
    logs.map((l) => ({
      date: l.date,
      minutes: l.minutes,
      domain: l.domain,
      result: l.result,
      bpm: l.bpm,
      title: l.title,
      trackId: l.exerciseId ?? l.passageId ?? l.pieceId ?? l.id,
      key: l.key,
    })),
    previousStart,
  );
  const report = milestones(
    logs,
    (pieces.data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      passageIds: (passages.data ?? []).filter((x) => x.user_repertoire_id === p.id).map((x) => x.id),
      completedOn: p.status === "completed" ? p.updated_at.slice(0, 10) : null,
    })),
    (catalog.data ?? []).map((c) => ({ name: c.name, exerciseIds: c.links.map((l) => l.exercise_id) })),
  );
  const retry = week.filter((l) => l.result === "retry").length;
  const sessionCount = new Set((sessions.data ?? []).map((s) => s.session_date)).size;
  const delta = thisWeek - lastWeek;

  // Suivi du tempo : exercices et morceaux ayant au moins un BPM saisi.
  const tracked = new Map<string, string>();
  for (const l of logs) if (l.bpm !== null) tracked.set(l.exerciseId ?? l.pieceId ?? "", l.title);
  const param = (await searchParams).suivi;
  const selected = typeof param === "string" && tracked.has(param) ? param : [...tracked.keys()].pop();
  const points = logs
    .filter((l) => l.bpm !== null && (l.exerciseId ?? l.pieceId) === selected)
    .map((l) => ({ date: l.date, bpm: l.bpm as number }));

  return (
    <Screen>
      <BackLink />
      <PageHead
        icon={ChartLine}
        tint="lilac"
        title="Progression"
        subtitle={thisWeek > 0 ? `${formatMinutes(thisWeek)} cette semaine.` : "Pas encore de pratique cette semaine."}
      />

      <div className="mb-8 flex h-[140px] max-w-[520px] items-end gap-3.5" role="img" aria-label={`Minutes de pratique par jour : ${days.map((d) => `${formatWeekdayShort(d.date)} ${d.minutes}`).join(", ")}`}>
        {days.map((d) => (
          <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <i
              className={cn("block w-full rounded-[10px]", d.date === today ? "bg-ink" : "bg-lilac")}
              style={{ height: `${Math.max(4, (d.minutes / peak) * 100)}%` }}
            />
            <span className="text-sm text-ink-2">{formatWeekdayShort(d.date)}</span>
          </div>
        ))}
      </div>

      {logs.length === 0 ? (
        <EmptyState title="Tes progrès apparaîtront ici">
          <p>Dès ta première séance, tu verras ton temps de pratique, tes résultats et tes tempos.</p>
        </EmptyState>
      ) : (
        <>
          <List>
            <Row
              main="Temps de pratique"
              detail="Cette semaine"
              meta={`${formatMinutes(thisWeek)}${
                lastWeek > 0 && delta > 0 ? `, ${formatMinutes(delta)} de plus que la précédente` : ""
              }`}
            />
            <Row
              main="Séances"
              detail="Cette semaine"
              meta={`${sessionCount} ${sessionCount > 1 ? "séances" : "séance"}${
                retry > 0 ? `, ${retry} ${retry > 1 ? "tâches" : "tâche"} à retravailler` : ""
              }`}
            />
          </List>

          <SectionTitle>Bilan de la semaine dernière</SectionTitle>
          <Panel label={`Du ${formatShortDate(previousStart)} au ${formatShortDate(addDays(previousStart, 6))}`} title={summary.title}>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {summary.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Panel>

          <SectionTitle>Calendrier de pratique</SectionTitle>
          <PracticeCalendar weeks={calendar} />

          <SectionTitle>Temps par domaine, 4 dernières semaines</SectionTitle>
          <DomainWeeks weeks={domainWeeks} />

          <SectionTitle>Tempo de travail</SectionTitle>
          {tracked.size === 0 ? (
            <p className="text-[17px] text-ink-2">Saisis un BPM pendant une séance pour suivre ton tempo ici.</p>
          ) : (
            <>
              <form method="get" className="mb-4 flex max-w-[760px] flex-wrap items-end gap-3">
                <div className="w-80 max-w-full">
                  <Label htmlFor="suivi">Exercice ou morceau</Label>
                  <Select id="suivi" name="suivi" defaultValue={selected}>
                    {[...tracked.entries()].map(([id, title]) => (
                      <option key={id} value={id}>
                        {title}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" variant="outline" size="md">
                  Afficher
                </Button>
              </form>
              {points.length > 0 ? <BpmChart points={points} /> : null}
            </>
          )}

          <SectionTitle>Records et jalons</SectionTitle>
          <List>
            {report.records.map((r) => (
              <Row key={r.label} main={r.label} detail={formatShortDate(r.date)} meta={r.value} />
            ))}
            {report.next.map((n) => (
              <Row key={n.label} main={`Prochain jalon : ${n.label}`} meta={n.remaining} />
            ))}
          </List>
          {report.achieved.length > 0 ? (
            <List className="mt-6">
              {report.achieved.slice(0, 10).map((a) => (
                <Row key={a.id} main={`✓ ${a.label}`} meta={formatShortDate(a.date)} />
              ))}
            </List>
          ) : null}

          <SectionTitle>Compétences en cours</SectionTitle>
          {(competencies.data ?? []).length === 0 ? (
            <p className="text-[17px] text-ink-2">Elles apparaîtront après tes premiers résultats.</p>
          ) : (
            <List>
              {(competencies.data ?? []).map((c, i) => (
                <Row
                  key={i}
                  main={c.competency?.name ?? "—"}
                  meta={COMPETENCY_STATUS_LABEL[c.status as CompetencyStatus]}
                />
              ))}
            </List>
          )}

          <SectionTitle>Derniers résultats</SectionTitle>
          <List>
            {logs
              .slice(-15)
              .reverse()
              .map((l) => (
                <Row
                  key={l.id}
                  main={l.title}
                  detail={`${formatShortDate(l.date)} · ${DOMAIN_LABEL[l.domain]} · ${l.minutes} min`}
                  meta={`${RESULT_LABEL[l.result]}${l.bpm ? ` · ${l.bpm} BPM` : ""}`}
                />
              ))}
          </List>
        </>
      )}
    </Screen>
  );
}
