import { z } from "zod";
import { EXERCISE_DOMAINS } from "@/lib/domain/domains";
import { isIsoDate } from "@/lib/dates";

/** Champ de formulaire vide → undefined. */
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalInt = (min: number, max: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional());
const text = (max: number) => z.string().trim().max(max);

export const isoDateSchema = z.string().refine(isIsoDate, "Date invalide.");

export const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide.").max(254),
  password: z.string().min(1, "Mot de passe requis.").max(200),
});

export const resultSchema = z.object({
  taskId: z.uuid(),
  result: z.enum(["success", "retry"], "Choisis « Réussi » ou « À retravailler »."),
  bpm: optionalInt(20, 300),
  minutes: z.coerce.number().int().min(1).max(180),
});

export const taskIdSchema = z.object({ taskId: z.uuid() });
export const moveTaskSchema = z.object({ taskId: z.uuid(), date: isoDateSchema });
export const replaceTaskSchema = z.object({ taskId: z.uuid(), exerciseId: z.uuid() });
export const addExerciseSchema = z.object({ exerciseId: z.uuid(), date: isoDateSchema });
export const regenerateSchema = z.object({
  weekStart: isoDateSchema,
  overwrite: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

const pieceFields = {
  title: text(200).min(1, "Le titre est requis."),
  composer: text(120).default(""),
  style: z.enum(["classical", "film", "other"]),
  tier: z.enum(["comfort", "growth", "challenge"]),
  status: z.enum(["to_discover", "active", "paused", "completed"]),
  level: optionalInt(1, 5),
  feltDifficulty: optionalInt(1, 5),
  currentStep: text(200).default(""),
  notes: text(4000).default(""),
  sourceUrl: z.preprocess(
    emptyToUndefined,
    z.url("Lien invalide.").max(500).refine((u) => /^https?:\/\//.test(u), "Le lien doit commencer par http(s)://").optional(),
  ),
};
export const pieceSchema = z.object(pieceFields);
export const pieceUpdateSchema = z.object({ id: z.uuid(), ...pieceFields });
export const idSchema = z.object({ id: z.uuid() });

export const PDF_MAX_BYTES = 20 * 1024 * 1024;
export const pdfRegisterSchema = z.object({
  pieceId: z.uuid(),
  assetId: z.uuid(),
  filename: text(200).min(1),
});

const level = z.coerce.number().int().min(1).max(3);
const preference = z.coerce.number().int().min(0).max(2);
const domainRecord = <T extends z.ZodType>(schema: T) =>
  z.object(Object.fromEntries(EXERCISE_DOMAINS.map((d) => [d, schema])) as Record<(typeof EXERCISE_DOMAINS)[number], T>);

export const profileSchema = z.object({
  displayName: text(60).default(""),
  timezone: z
    .string()
    .max(64)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("fr-FR", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Fuseau horaire inconnu."),
  weekdayMinutes: z.coerce.number().int().min(5, "5 minutes minimum.").max(180, "180 minutes maximum."),
  weekendMinutes: z.coerce.number().int().min(5, "5 minutes minimum.").max(180, "180 minutes maximum."),
  practiceDays: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Choisis au moins un jour de pratique."),
  showStreak: z.boolean(),
  challengeLevel: z.enum(["gentle", "balanced", "ambitious"]),
  levels: domainRecord(level),
  preferences: domainRecord(preference),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Saisie invalide.";
}
