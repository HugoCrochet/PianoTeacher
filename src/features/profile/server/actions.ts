"use server";

import { revalidatePath } from "next/cache";
import { done, fail, type ActionState } from "@/lib/action";
import { weekStartOf } from "@/lib/dates";
import { EXERCISE_DOMAINS } from "@/lib/domain/domains";
import { firstError, profileSchema } from "@/lib/validation/schemas";
import { regenerateWeek } from "@/features/planner/server/plan-service";
import { getContext } from "./profile";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    timezone: formData.get("timezone"),
    weekdayMinutes: formData.get("weekdayMinutes"),
    weekendMinutes: formData.get("weekendMinutes"),
    practiceDays: formData.getAll("practiceDays"),
    showStreak: formData.get("showStreak") === "on",
    challengeLevel: formData.get("challengeLevel"),
    levels: Object.fromEntries(EXERCISE_DOMAINS.map((d) => [d, formData.get(`level_${d}`)])),
    preferences: Object.fromEntries(EXERCISE_DOMAINS.map((d) => [d, formData.get(`pref_${d}`)])),
  });
  if (!parsed.success) return fail(firstError(parsed.error));
  const p = parsed.data;

  const ctx = await getContext();
  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      display_name: p.displayName,
      timezone: p.timezone,
      weekday_minutes: p.weekdayMinutes,
      weekend_minutes: p.weekendMinutes,
      practice_days: [...new Set(p.practiceDays)].sort(),
      show_streak: p.showStreak,
      challenge_level: p.challengeLevel,
      self_assessment: p.levels,
      domain_preferences: p.preferences,
      onboarded_at: ctx.profile.onboardedAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.user.id);
  if (error) return fail("Tes réglages n'ont pas pu être enregistrés. Réessaie.");

  // Le programme à venir suit les nouveaux réglages ; les jours modifiés à la main sont conservés.
  // `getContext` est mis en cache par requête : on repart du profil à jour.
  try {
    await regenerateWeek(
      {
        ...ctx,
        profile: {
          ...ctx.profile,
          timezone: p.timezone,
          weekdayMinutes: p.weekdayMinutes,
          weekendMinutes: p.weekendMinutes,
          practiceDays: p.practiceDays,
          challengeLevel: p.challengeLevel,
          levels: p.levels,
          preferences: p.preferences,
        },
      },
      weekStartOf(ctx.today),
    );
  } catch {
    // Les réglages sont enregistrés ; le programme pourra être regénéré depuis « Programme ».
  }
  revalidatePath("/", "layout");
  return done("Réglages enregistrés. Le programme à venir a été ajusté.");
}
