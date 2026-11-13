import Link from "next/link";
import { ChartLine, Clock, Music, Piano, Route, Settings, type LucideIcon } from "lucide-react";
import { Screen, tintClass, type Tint } from "@/components/layout/page";
import { addDays, formatMinutes, weekStartOf } from "@/lib/dates";
import { DOMAIN_LABEL, EXERCISE_DOMAINS, type CompetencyStatus } from "@/lib/domain/domains";
import { cn } from "@/lib/utils";
import { currentLevel } from "@/features/curriculum/domain/competency-status";
import { ensureWeekPlan } from "@/features/planner/server/plan-service";
import { getLogs, getSession, getTasks } from "@/features/practice/server/queries";
import { getContext } from "@/features/profile/server/profile";
import { streak, totalMinutes } from "@/features/progress/domain/stats";

function Tile({
  href,
  icon: Icon,
  tint,
  title,
  children,
}: {
  href: string;
  icon: LucideIcon;
  tint: Tint;
  title: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[170px] flex-col justify-between rounded-3xl px-[30px] py-7 text-ink transition-transform active:scale-[0.99]",
        tintClass[tint],
      )}
    >
      <Icon size={40} strokeWidth={1.6} aria-hidden />
      <div>
        <h2 className="text-[28px] font-bold tracking-[-0.01em]">{title}</h2>
        <p className="mt-1 max-w-[36ch] text-[17px] text-ink-2">{children}</p>
      </div>
    </Link>
  );
}

function greeting(timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "numeric", hour12: false }).format(new Date()),
  );
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}

export default async function HomePage() {
  const ctx = await getContext();
  const { supabase, profile, today } = ctx;
  const weekStart = weekStartOf(today);
  await ensureWeekPlan(ctx, weekStart);

  const [tasks, session, logs, pieces, competencies, statuses] = await Promise.all([
    getTasks(supabase, today),
    getSession(supabase, today),
    getLogs(supabase, addDays(today, -120)),
    supabase.from("user_repertoire").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("competencies").select("id, domain, level"),
    supabase.from("user_competencies").select("competency_id, status"),
  ]);

  const planned = tasks.filter((t) => t.status === "planned");
  const minutesToday = tasks.reduce((sum, t) => sum + t.plannedMinutes, 0);
  const sessionLine =
    tasks.length === 0
      ? "Pas de séance prévue aujourd'hui. Profite, ou ajoute un exercice."
      : planned.length === 0
        ? "Séance du jour terminée. À demain !"
        : session?.status === "in_progress"
          ? `Ta séance est en cours, encore ${planned.length} ${planned.length > 1 ? "tâches" : "tâche"}.`
          : `Ta séance du jour est prête, ${minutesToday} minutes.`;
  const todayLine =
    tasks.length === 0
      ? "Rien de prévu aujourd'hui."
      : [...new Set(tasks.map((t) => (t.domain === "repertoire" ? t.title : DOMAIN_LABEL[t.domain])))].join(", ") + ".";

  const weekMinutes = totalMinutes(
    logs.map((l) => ({ date: l.date, minutes: l.minutes, domain: l.domain, result: l.result })),
    weekStart,
    addDays(weekStart, 6),
  );
  const days = streak([...new Set(logs.map((l) => l.date))], today);
  const pieceCount = pieces.count ?? 0;

  // Parcours : domaine dont le niveau en cours est le plus bas.
  const statusById = new Map((statuses.data ?? []).map((s) => [s.competency_id, s.status as CompetencyStatus]));
  const path = EXERCISE_DOMAINS.map((domain) => ({
    domain,
    progress: currentLevel(
      (competencies.data ?? [])
        .filter((c) => c.domain === domain)
        .map((c) => ({ level: c.level, status: statusById.get(c.id) ?? "upcoming" })),
    ),
  }))
    .filter((d) => d.progress !== null)
    .sort((a, b) => (a.progress?.level ?? 0) - (b.progress?.level ?? 0))[0];

  return (
    <Screen>
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-[1.1] font-bold tracking-[-0.02em] md:text-[40px]">
            {greeting(profile.timezone)}
            {profile.displayName ? ` ${profile.displayName}` : ""}
          </h1>
          <p className="mt-1.5 text-[17px] text-ink-2">{sessionLine}</p>
        </div>
        <div className="flex items-center gap-4">
          {profile.showStreak && days > 0 ? (
            <p className="text-base whitespace-nowrap text-ink-2">
              <b className="font-bold text-ink">
                {days} {days > 1 ? "jours" : "jour"}
              </b>{" "}
              d’affilée
            </p>
          ) : null}
          <Link
            href="/parametres"
            aria-label="Paramètres"
            className="grid size-11 flex-none place-items-center rounded-full text-ink-2"
          >
            <Settings size={24} strokeWidth={1.6} aria-hidden />
          </Link>
        </div>
      </header>

      {!profile.onboardedAt ? (
        <Link
          href="/parametres"
          className="mb-[18px] block rounded-[20px] border-[1.5px] border-line px-[26px] py-5"
        >
          <strong className="block text-[19px] font-bold">Bienvenue !</strong>
          <span className="text-[15px] text-ink-2">
            Indique ton niveau et tes disponibilités pour ajuster ton programme.
          </span>
        </Link>
      ) : null}

      <nav aria-label="Sections" className="grid flex-1 gap-[18px] md:grid-cols-2 md:grid-rows-2">
        <Tile href="/aujourdhui" icon={Clock} tint="mint" title="Aujourd’hui">
          {todayLine}
        </Tile>
        <Tile href="/progression" icon={ChartLine} tint="lilac" title="Progression">
          {weekMinutes > 0
            ? `${formatMinutes(weekMinutes)} de pratique cette semaine.`
            : "Pas encore de pratique cette semaine."}
        </Tile>
        <Tile href="/repertoire" icon={Music} tint="butter" title="Répertoire">
          {pieceCount > 0
            ? `${pieceCount} ${pieceCount > 1 ? "morceaux" : "morceau"} en cours.`
            : "Choisis un premier morceau à travailler."}
        </Tile>
        <Tile href="/exercices" icon={Piano} tint="peach" title="Exercices">
          Technique, gammes, lecture et improvisation.
        </Tile>
      </nav>

      <Link
        href="/parcours"
        className="mt-[18px] flex items-center gap-[22px] rounded-[20px] border-[1.5px] border-line px-[26px] py-5"
      >
        <Route size={32} strokeWidth={1.6} className="flex-none" aria-hidden />
        <div className="min-w-0 flex-1">
          <strong className="block text-[19px] font-bold">Parcours pédagogique</strong>
          <span className="text-[15px] text-ink-2">
            {path?.progress
              ? `Niveau ${path.progress.level}, ${DOMAIN_LABEL[path.domain].toLowerCase()} : ${path.progress.done} sur ${path.progress.total} compétences acquises`
              : "Tes compétences, étape par étape."}
          </span>
        </div>
        {path?.progress ? (
          <div
            className="hidden h-2 w-[180px] flex-none overflow-hidden rounded bg-line md:block"
            role="img"
            aria-label={`${path.progress.percent} % du niveau ${path.progress.level}`}
          >
            <i className="block h-full rounded bg-ink" style={{ width: `${path.progress.percent}%` }} />
          </div>
        ) : null}
      </Link>
    </Screen>
  );
}
