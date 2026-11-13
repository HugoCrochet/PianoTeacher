/** Dates calendaires au format ISO `YYYY-MM-DD`, calculées sans dépendre du fuseau du serveur. */
export type IsoDate = string;

const DAY_MS = 86_400_000;

function toUtc(date: IsoDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUtc(toUtc(value)) === value;
}

/** Date du jour dans le fuseau de l'utilisateur. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): IsoDate {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  }
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

export function diffDays(later: IsoDate, earlier: IsoDate): number {
  return Math.round((toUtc(later) - toUtc(earlier)) / DAY_MS);
}

/** Jour ISO : 1 = lundi … 7 = dimanche. */
export function isoWeekday(date: IsoDate): number {
  const day = new Date(toUtc(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function weekStartOf(date: IsoDate): IsoDate {
  return addDays(date, 1 - isoWeekday(date));
}

export function weekDates(weekStart: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function format(date: IsoDate, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(new Date(toUtc(date)));
}

/** « vendredi 13 novembre » */
export function formatLongDate(date: IsoDate): string {
  return format(date, { weekday: "long", day: "numeric", month: "long" });
}

/** « 13 nov. » */
export function formatShortDate(date: IsoDate): string {
  return format(date, { day: "numeric", month: "short" });
}

/** « Lun » */
export function formatWeekdayShort(date: IsoDate): string {
  const label = format(date, { weekday: "short" }).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** « lundi » */
export function formatWeekdayLong(date: IsoDate): string {
  return format(date, { weekday: "long" });
}

/** 220 → « 3 h 40 », 25 → « 25 min » */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
