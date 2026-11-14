import { tintClass, type Tint } from "@/components/layout/page";
import { formatMinutes, formatShortDate } from "@/lib/dates";
import { DOMAINS, DOMAIN_LABEL, type Domain } from "@/lib/domain/domains";
import { cn } from "@/lib/utils";
import { DAY_LEVEL_LABEL, type CalendarDay, type DayLevel, type DomainWeek } from "./domain/calendar";

/** Couleur de chaque domaine, reprise des tons de la maquette. */
export const DOMAIN_TINT: Record<Domain, Tint> = {
  technique: "peach",
  scales_harmony: "sky",
  reading_rhythm: "mint",
  improvisation: "lilac",
  repertoire: "butter",
};

const LEVEL_CLASS: Record<DayLevel, string> = {
  none: "border-[1.5px] border-line",
  practiced: "border-[1.5px] border-ink-2 bg-lilac",
  goal: "bg-ink",
};
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });

/**
 * Calendrier de pratique : une colonne par semaine, une ligne par jour.
 * L'information est aussi donnée en texte (résumé, légende, titre de chaque case).
 */
export function PracticeCalendar({ weeks }: { weeks: readonly CalendarDay[][] }) {
  const days = weeks.flat().filter((d) => !d.future);
  const practiced = days.filter((d) => d.level !== "none").length;
  const goal = days.filter((d) => d.level === "goal").length;
  const summary = `${practiced} jour${practiced > 1 ? "s" : ""} de pratique sur les ${weeks.length} dernières semaines, dont ${goal} avec la durée prévue atteinte.`;

  return (
    <figure className="max-w-[520px]">
      <div
        role="img"
        aria-label={summary}
        className="grid gap-1"
        style={{ gridTemplateColumns: `1.25rem repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        <span aria-hidden />
        {weeks.map((w, i) => {
          const month = MONTH.format(new Date(`${w[0].date}T00:00:00Z`)).replace(".", "");
          const previous = i > 0 ? MONTH.format(new Date(`${weeks[i - 1][0].date}T00:00:00Z`)).replace(".", "") : null;
          return (
            <span key={w[0].date} aria-hidden className="text-[13px] whitespace-nowrap text-ink-2">
              {month !== previous ? month : ""}
            </span>
          );
        })}
        {WEEKDAYS.map((label, d) => [
          <span key={`l-${d}`} aria-hidden className="self-center text-[13px] text-ink-2">
            {d % 2 === 0 ? label : ""}
          </span>,
          ...weeks.map((w) => {
            const day = w[d];
            return (
              <span
                key={day.date}
                title={day.future ? undefined : `${formatShortDate(day.date)} : ${day.minutes > 0 ? formatMinutes(day.minutes) : "pas de pratique"}`}
                className={cn("aspect-square rounded-[6px]", day.future ? "" : LEVEL_CLASS[day.level])}
              />
            );
          }),
        ])}
      </div>
      <figcaption className="mt-3 text-[15px] text-ink-2">
        <span className="flex flex-wrap gap-x-5 gap-y-2">
          {(Object.keys(DAY_LEVEL_LABEL) as DayLevel[]).map((level) => (
            <span key={level} className="inline-flex items-center gap-2">
              <span aria-hidden className={cn("size-3.5 rounded-[4px]", LEVEL_CLASS[level])} />
              {DAY_LEVEL_LABEL[level]}
            </span>
          ))}
        </span>
        <span className="mt-2 block">{summary}</span>
      </figcaption>
    </figure>
  );
}

/** Temps par domaine, une barre empilée par semaine, puis le détail en texte. */
export function DomainWeeks({ weeks }: { weeks: readonly DomainWeek[] }) {
  const peak = Math.max(1, ...weeks.map((w) => w.total));
  const totals = Object.fromEntries(DOMAINS.map((d) => [d, weeks.reduce((s, w) => s + w.byDomain[d], 0)])) as Record<Domain, number>;

  return (
    <div className="max-w-[760px]">
      <ol className="space-y-4">
        {weeks.map((w, i) => {
          const parts = DOMAINS.filter((d) => w.byDomain[d] > 0);
          const label = i === weeks.length - 1 ? "Cette semaine" : `Semaine du ${formatShortDate(w.weekStart)}`;
          return (
            <li key={w.weekStart}>
              <div className="mb-1.5 flex justify-between gap-3 text-[15px]">
                <span className="text-ink-2">{label}</span>
                <span>{w.total > 0 ? formatMinutes(w.total) : "pas de pratique"}</span>
              </div>
              <div
                role="img"
                aria-label={
                  w.total > 0
                    ? `${label} : ${parts.map((d) => `${DOMAIN_LABEL[d]} ${formatMinutes(w.byDomain[d])}`).join(", ")}`
                    : `${label} : pas de pratique`
                }
                className="h-6 rounded-full bg-line/60"
              >
                {w.total > 0 ? (
                  <div className="flex h-full gap-0.5 overflow-hidden rounded-full" style={{ width: `${(w.total / peak) * 100}%` }}>
                    {parts.map((d) => (
                      <span
                        key={d}
                        className={cn("h-full border-[1.5px] border-ink/40 first:rounded-l-full last:rounded-r-full", tintClass[DOMAIN_TINT[d]])}
                        style={{ width: `${(w.byDomain[d] / w.total) * 100}%` }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <ul className="mt-6 list-none border-t-[1.5px] border-line">
        {DOMAINS.map((d) => (
          <li key={d} className="flex items-center gap-[18px] border-b-[1.5px] border-line px-1 py-[14px] text-lg">
            <span aria-hidden className={cn("size-4 flex-none rounded-[5px] border-[1.5px] border-ink/40", tintClass[DOMAIN_TINT[d]])} />
            <span className="min-w-0 flex-1">{DOMAIN_LABEL[d]}</span>
            <span className="text-base text-ink-2">{totals[d] > 0 ? formatMinutes(totals[d]) : "pas encore"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
