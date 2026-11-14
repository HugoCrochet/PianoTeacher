import { addDays, weekStartOf, type IsoDate } from "@/lib/dates";
import { DOMAINS, type Domain } from "@/lib/domain/domains";
import type { StatLog } from "./stats";

export type DayLevel = "none" | "practiced" | "goal";

export const DAY_LEVEL_LABEL: Record<DayLevel, string> = {
  none: "Pas de pratique",
  practiced: "Pratiqué",
  goal: "Durée prévue atteinte",
};

export interface CalendarDay {
  date: IsoDate;
  minutes: number;
  level: DayLevel;
  future: boolean;
}

/**
 * Calendrier de pratique : `weeks` colonnes (de la plus ancienne à la semaine en cours),
 * 7 jours chacune (lundi → dimanche). « Durée prévue atteinte » quand les minutes réelles
 * égalent au moins la durée prévue ce jour-là ; un jour sans pratique n'est jamais marqué
 * comme un manque.
 */
export function practiceCalendar(
  logs: readonly StatLog[],
  today: IsoDate,
  weeks: number,
  goalFor: (date: IsoDate) => number,
): CalendarDay[][] {
  const minutes = new Map<IsoDate, number>();
  for (const l of logs) minutes.set(l.date, (minutes.get(l.date) ?? 0) + l.minutes);
  const firstMonday = addDays(weekStartOf(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(firstMonday, w * 7 + d);
      const m = minutes.get(date) ?? 0;
      const goal = goalFor(date);
      const level: DayLevel = m === 0 ? "none" : goal > 0 && m >= goal ? "goal" : "practiced";
      return { date, minutes: m, level, future: date > today };
    }),
  );
}

export interface DomainWeek {
  weekStart: IsoDate;
  total: number;
  byDomain: Record<Domain, number>;
}

/** Minutes réelles par domaine pour chacune des `weeks` dernières semaines (la plus ancienne d'abord). */
export function minutesPerDomainByWeek(logs: readonly StatLog[], today: IsoDate, weeks: number): DomainWeek[] {
  const current = weekStartOf(today);
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(current, -7 * (weeks - 1 - i));
    const end = addDays(weekStart, 6);
    const byDomain = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
    let total = 0;
    for (const l of logs) {
      if (l.date < weekStart || l.date > end) continue;
      byDomain[l.domain] += l.minutes;
      total += l.minutes;
    }
    return { weekStart, total, byDomain };
  });
}
