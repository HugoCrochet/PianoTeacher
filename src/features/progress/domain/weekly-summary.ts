import { addDays, formatMinutes, type IsoDate } from "@/lib/dates";
import { DOMAINS, DOMAIN_LABEL, type Domain, type PracticeResult } from "@/lib/domain/domains";

export interface SummaryLog {
  date: IsoDate;
  minutes: number;
  domain: Domain;
  result: PracticeResult;
  bpm: number | null;
  title: string;
  /** Exercice, morceau ou passage suivi pour le tempo. */
  trackId: string;
  key: string | null;
}

export interface WeeklySummary {
  title: string;
  lines: string[];
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

/**
 * Bilan d'une semaine (lundi `weekStart` → dimanche), d'après les seuls résultats réels.
 * Toujours encourageant : on souligne ce qui a été fait, jamais ce qui manque.
 */
export function weeklySummary(logs: readonly SummaryLog[], weekStart: IsoDate): WeeklySummary {
  const end = addDays(weekStart, 6);
  const week = logs.filter((l) => l.date >= weekStart && l.date <= end);
  const before = logs.filter((l) => l.date < weekStart);

  if (week.length === 0) {
    return {
      title: "Une semaine de pause",
      lines: ["Les pauses font partie du chemin. Une séance de 10 minutes suffit pour relancer la machine."],
    };
  }

  const minutes = week.reduce((s, l) => s + l.minutes, 0);
  const days = new Set(week.map((l) => l.date)).size;
  const lines: string[] = [];

  const previousStart = addDays(weekStart, -7);
  const previous = before.filter((l) => l.date >= previousStart).reduce((s, l) => s + l.minutes, 0);
  if (previous > 0 && minutes > previous) lines.push(`${formatMinutes(minutes - previous)} de plus que la semaine d’avant.`);

  const domains = DOMAINS.filter((d) => week.some((l) => l.domain === d));
  lines.push(
    domains.length === DOMAINS.length
      ? "Les 5 domaines travaillés : belle variété."
      : `${plural(domains.length, "domaine travaillé", "domaines travaillés")} : ${domains.map((d) => DOMAIN_LABEL[d].toLowerCase()).join(", ")}.`,
  );

  // Gains de tempo : meilleur BPM de la semaine contre meilleur BPM d'avant.
  const best = (items: readonly SummaryLog[], id: string) =>
    Math.max(0, ...items.filter((l) => l.trackId === id && l.bpm !== null).map((l) => l.bpm as number));
  const gains = [...new Set(week.filter((l) => l.bpm !== null).map((l) => l.trackId))]
    .map((id) => {
      const previousBest = best(before, id);
      return { title: week.find((l) => l.trackId === id)?.title ?? "", gain: previousBest > 0 ? best(week, id) - previousBest : 0 };
    })
    .filter((g) => g.gain > 0)
    .sort((a, b) => b.gain - a.gain || a.title.localeCompare(b.title, "fr"));
  if (gains.length > 0) {
    lines.push(`Tempo en hausse : ${gains.slice(0, 2).map((g) => `+${g.gain} BPM sur ${g.title}`).join(", ")}.`);
  }

  const knownKeys = new Set(before.map((l) => l.key).filter(Boolean));
  const newKeys = [...new Set(week.map((l) => l.key).filter((k): k is string => Boolean(k) && !knownKeys.has(k)))];
  if (newKeys.length > 0) lines.push(`Nouvelle${newKeys.length > 1 ? "s" : ""} tonalité${newKeys.length > 1 ? "s" : ""} : ${newKeys.join(", ")}.`);

  const successes = week.filter((l) => l.result === "success").length;
  const retries = week.length - successes;
  lines.push(
    retries > 0
      ? `${plural(successes, "réussite", "réussites")} et ${plural(retries, "tâche", "tâches")} à retravailler : elles reviendront, c’est comme ça qu’on progresse.`
      : `${plural(successes, "réussite", "réussites")}, sans rien à retravailler.`,
  );

  return { title: `${plural(days, "jour", "jours")} de pratique, ${formatMinutes(minutes)}`, lines };
}
