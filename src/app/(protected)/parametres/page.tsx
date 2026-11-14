import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { BackLink, PageHead, Screen, SectionTitle } from "@/components/layout/page";
import { buttonVariants } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { DOMAIN_LABEL, EXERCISE_DOMAINS } from "@/lib/domain/domains";
import { signOut } from "@/features/auth/server/actions";
import { updateProfile } from "@/features/profile/server/actions";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Paramètres" };

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const LEVELS = [
  { value: 1, label: "1 — je débute ou je reprends" },
  { value: 2, label: "2 — à l’aise sur les bases" },
  { value: 3, label: "3 — prêt pour plus difficile" },
];
const PREFERENCES = [
  { value: 0, label: "Un peu moins" },
  { value: 1, label: "Normal" },
  { value: 2, label: "Un peu plus" },
];

export default async function SettingsPage() {
  const { profile, user } = await getContext();

  return (
    <Screen>
      <BackLink />
      <PageHead
        icon={Settings}
        tint="sky"
        title="Paramètres"
        subtitle={profile.onboardedAt ? (user.email ?? undefined) : "Bienvenue ! Vérifie ces réglages pour démarrer."}
      />

      <ActionForm action={updateProfile} className="max-w-[760px]">
        <SectionTitle>Profil</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="displayName">Prénom</Label>
            <Input id="displayName" name="displayName" maxLength={60} defaultValue={profile.displayName} autoComplete="given-name" />
          </div>
          <div>
            <Label htmlFor="timezone">Fuseau horaire</Label>
            <Input id="timezone" name="timezone" required defaultValue={profile.timezone} />
          </div>
        </div>

        <SectionTitle>Disponibilités</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="weekdayMinutes">Minutes par jour, du lundi au vendredi</Label>
            <Input id="weekdayMinutes" name="weekdayMinutes" type="number" inputMode="numeric" min={5} max={180} step={5} required defaultValue={profile.weekdayMinutes} />
          </div>
          <div>
            <Label htmlFor="weekendMinutes">Minutes par jour, le week-end</Label>
            <Input id="weekendMinutes" name="weekendMinutes" type="number" inputMode="numeric" min={5} max={180} step={5} required defaultValue={profile.weekendMinutes} />
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className="mb-1.5 text-[15px] text-ink-2">Jours de pratique</legend>
          <div className="flex flex-wrap gap-x-5">
            {DAYS.map((label, i) => (
              <label key={label} className="flex min-h-11 items-center gap-2 text-[17px]">
                <input
                  type="checkbox"
                  name="practiceDays"
                  value={i + 1}
                  defaultChecked={profile.practiceDays.includes(i + 1)}
                  className="size-5 accent-ink"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <SectionTitle>Ton niveau par domaine</SectionTitle>
        <p className="mb-3 text-[17px] text-ink-2">
          Une auto-évaluation suffit. Elle sert à choisir des exercices adaptés, tu peux la changer à tout moment.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {EXERCISE_DOMAINS.map((d) => (
            <div key={d}>
              <Label htmlFor={`level_${d}`}>{DOMAIN_LABEL[d]}</Label>
              <Select id={`level_${d}`} name={`level_${d}`} defaultValue={profile.levels[d]}>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>

        <SectionTitle>Préférences</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {EXERCISE_DOMAINS.map((d) => (
            <div key={d}>
              <Label htmlFor={`pref_${d}`}>{DOMAIN_LABEL[d]}</Label>
              <Select id={`pref_${d}`} name={`pref_${d}`} defaultValue={profile.preferences[d]}>
                {PREFERENCES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
          <div>
            <Label htmlFor="challengeLevel">Niveau de challenge</Label>
            <Select id="challengeLevel" name="challengeLevel" defaultValue={profile.challengeLevel}>
              <option value="gentle">Tranquille — surtout de la révision</option>
              <option value="balanced">Équilibré</option>
              <option value="ambitious">Ambitieux — un cran au-dessus</option>
            </Select>
          </div>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-3 text-[17px]">
          <input type="checkbox" name="showStreak" defaultChecked={profile.showStreak} className="size-5 accent-ink" />
          Afficher ma série de jours d’affilée sur l’accueil
        </label>

        <SubmitButton className="mt-7" pendingLabel="Enregistrement…">
          Enregistrer
        </SubmitButton>
      </ActionForm>

      <SectionTitle>Mes données</SectionTitle>
      <p className="max-w-[760px] text-[17px] text-ink-2">
        Télécharge une copie de tes données. Les fichiers PDF ne sont pas inclus, seulement leur liste.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/export?format=json" download className={buttonVariants({ variant: "outline", size: "md" })}>
          Tout exporter (JSON)
        </a>
        <a href="/export?format=csv" download className={buttonVariants({ variant: "outline", size: "md" })}>
          Historique de pratique (CSV)
        </a>
      </div>

      <SectionTitle>Session</SectionTitle>
      <form action={signOut}>
        <SubmitButton variant="outline" size="md" pendingLabel="Déconnexion…">
          Se déconnecter
        </SubmitButton>
      </form>
    </Screen>
  );
}
