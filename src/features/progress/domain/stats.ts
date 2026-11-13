import { addDays, diffDays, weekDates, type IsoDate } from "@/lib/dates";
import type { Domain, PracticeResult } from "@/lib/domain/domains";

export interface StatLog {
  date: IsoDate;
  minutes: number;
  domain: Domain;
  result: PracticeResult;
}

/** Minutes réellement pratiquées par jour de la semaine (lundi → dimanche). */
export function minutesPerDay(logs: readonly StatLog[], weekStart: IsoDate): { date: IsoDate; minutes: number }[] {
  return weekDates(weekStart).map((date) => ({
    date,
    minutes: logs.filter((l) => l.date === date).reduce((sum, l) => sum + l.minutes, 0),
  }));
}

export function totalMinutes(logs: readonly StatLog[], from: IsoDate, to: IsoDate): number {
  return logs.filter((l) => l.date >= from && l.date <= to).reduce((sum, l) => sum + l.minutes, 0);
}

export function minutesPerDomain(logs: readonly StatLog[]): Partial<Record<Domain, number>> {
  const out: Partial<Record<Domain, number>> = {};
  for (const l of logs) out[l.domain] = (out[l.domain] ?? 0) + l.minutes;
  return out;
}

/**
 * Jours d'affilée avec au moins un résultat enregistré.
 * La série reste affichée tant que la journée d'aujourd'hui n'est pas terminée.
 */
export function streak(practiceDates: readonly IsoDate[], today: IsoDate): number {
  const days = new Set(practiceDates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function daysSince(date: IsoDate, today: IsoDate): number {
  return diffDays(today, date);
}
