import "server-only";
import { cache } from "react";
import { todayInTimeZone, type IsoDate } from "@/lib/dates";
import { EXERCISE_DOMAINS, type ExerciseDomain } from "@/lib/domain/domains";
import { requireUser, type ServerClient, type SessionUser } from "@/lib/supabase/server";
import type { ChallengeLevel, PlannerSettings } from "@/features/planner/domain/build-plan";

export interface Profile {
  id: string;
  displayName: string;
  timezone: string;
  weekdayMinutes: number;
  weekendMinutes: number;
  practiceDays: number[];
  showStreak: boolean;
  challengeLevel: ChallengeLevel;
  levels: Record<ExerciseDomain, number>;
  preferences: Record<ExerciseDomain, number>;
  onboardedAt: string | null;
}

/** Point de départ décrit dans docs/PRODUCT.md §2 : clé de fa et rythme à renforcer. */
export const DEFAULT_LEVELS: Record<ExerciseDomain, number> = {
  technique: 2,
  scales_harmony: 2,
  reading_rhythm: 1,
  improvisation: 1,
};

function numberRecord(value: unknown, fallback: (d: ExerciseDomain) => number, min: number, max: number) {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    EXERCISE_DOMAINS.map((d) => {
      const n = Number(source[d]);
      return [d, Number.isInteger(n) && n >= min && n <= max ? n : fallback(d)];
    }),
  ) as Record<ExerciseDomain, number>;
}

export interface AppContext {
  supabase: ServerClient;
  user: SessionUser;
  profile: Profile;
  today: IsoDate;
}

/** Utilisateur vérifié + profil (créé au premier passage) + date locale. Dédupliqué par requête. */
export const getContext = cache(async (): Promise<AppContext> => {
  const { supabase, user } = await requireUser();
  const columns =
    "id, display_name, timezone, weekday_minutes, weekend_minutes, practice_days, show_streak, challenge_level, self_assessment, domain_preferences, onboarded_at";
  let { data: row } = await supabase.from("profiles").select(columns).eq("id", user.id).maybeSingle();
  if (!row) {
    const created = await supabase
      .from("profiles")
      .upsert({ id: user.id, self_assessment: DEFAULT_LEVELS }, { onConflict: "id", ignoreDuplicates: true })
      .select(columns)
      .maybeSingle();
    row = created.data ?? (await supabase.from("profiles").select(columns).eq("id", user.id).single()).data;
  }
  if (!row) throw new Error("Profil introuvable.");

  const profile: Profile = {
    id: row.id,
    displayName: row.display_name,
    timezone: row.timezone,
    weekdayMinutes: row.weekday_minutes,
    weekendMinutes: row.weekend_minutes,
    practiceDays: row.practice_days,
    showStreak: row.show_streak,
    challengeLevel: row.challenge_level as ChallengeLevel,
    levels: numberRecord(row.self_assessment, (d) => DEFAULT_LEVELS[d], 1, 3),
    preferences: numberRecord(row.domain_preferences, () => 1, 0, 2),
    onboardedAt: row.onboarded_at,
  };
  return { supabase, user, profile, today: todayInTimeZone(profile.timezone) };
});

export function plannerSettings(profile: Profile): PlannerSettings {
  return {
    weekdayMinutes: profile.weekdayMinutes,
    weekendMinutes: profile.weekendMinutes,
    practiceDays: profile.practiceDays,
    domainPreferences: profile.preferences,
    levels: profile.levels,
    challengeLevel: profile.challengeLevel,
  };
}
