import type { Metadata } from "next";
import Link from "next/link";
import { Piano } from "lucide-react";
import { BackLink, EmptyState, List, PageHead, Row, Screen } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { DOMAIN_LABEL, EXERCISE_DOMAINS, isExerciseDomain, type ExerciseDomain } from "@/lib/domain/domains";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Exercices" };

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

export default async function ExercisesPage({ searchParams }: PageProps<"/exercices">) {
  const { supabase } = await getContext();
  const params = await searchParams;
  const q = one(params.q);
  const domain = one(params.domaine);
  const level = Number(one(params.niveau));
  const key = one(params.tonalite);
  const maxMinutes = Number(one(params.duree));

  const all = await supabase
    .from("exercises")
    .select("id, slug, title, domain, level, estimated_minutes, key_signature, bpm_target")
    .order("domain")
    .order("level")
    .order("title");
  if (all.error) throw new Error(all.error.message);

  const keys = [...new Set(all.data.flatMap((e) => (e.key_signature ? [e.key_signature] : [])))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const needle = q.toLocaleLowerCase("fr");
  const list = all.data.filter(
    (e) =>
      (!needle || e.title.toLocaleLowerCase("fr").includes(needle)) &&
      (!isExerciseDomain(domain) || e.domain === domain) &&
      (!(level >= 1) || e.level === level) &&
      (!key || e.key_signature === key) &&
      (!(maxMinutes >= 1) || e.estimated_minutes <= maxMinutes),
  );
  const filtered = Boolean(q || domain || level || key || maxMinutes);

  return (
    <Screen>
      <BackLink />
      <PageHead icon={Piano} tint="peach" title="Exercices" subtitle="Des exercices courts, choisis selon ton niveau." />

      <form method="get" role="search" className="mb-7 grid max-w-[760px] grid-cols-2 gap-3 md:grid-cols-5">
        <div className="col-span-2 md:col-span-5">
          <Label htmlFor="q">Rechercher</Label>
          <Input id="q" name="q" type="search" defaultValue={q} placeholder="Gamme, arpège, rythme…" />
        </div>
        <div className="col-span-2 md:col-span-2">
          <Label htmlFor="domaine">Domaine</Label>
          <Select id="domaine" name="domaine" defaultValue={domain}>
            <option value="">Tous</option>
            {EXERCISE_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABEL[d]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="niveau">Niveau</Label>
          <Select id="niveau" name="niveau" defaultValue={level ? String(level) : ""}>
            <option value="">Tous</option>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                Niveau {n}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tonalite">Tonalité</Label>
          <Select id="tonalite" name="tonalite" defaultValue={key}>
            <option value="">Toutes</option>
            {keys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="duree">Durée max</Label>
          <Select id="duree" name="duree" defaultValue={maxMinutes ? String(maxMinutes) : ""}>
            <option value="">Toutes</option>
            <option value="5">5 min</option>
            <option value="10">10 min</option>
          </Select>
        </div>
        <div className="col-span-2 flex items-center gap-4 md:col-span-5">
          <Button type="submit" variant="outline" size="md">
            Filtrer
          </Button>
          {filtered ? (
            <Link href="/exercices" className="inline-flex min-h-11 items-center text-[17px] text-ink-2 underline underline-offset-4">
              Tout afficher
            </Link>
          ) : null}
        </div>
      </form>

      {list.length === 0 ? (
        <EmptyState title="Aucun exercice ne correspond">
          <p>Essaie d’élargir les filtres.</p>
        </EmptyState>
      ) : (
        <List>
          {list.map((e) => (
            <Row
              key={e.id}
              main={
                <Link href={`/exercices/${e.slug}`} className="underline-offset-4 hover:underline">
                  {e.title}
                </Link>
              }
              detail={[DOMAIN_LABEL[e.domain as ExerciseDomain], `niveau ${e.level}`, e.key_signature].filter(Boolean).join(" · ")}
              meta={e.bpm_target ? `${e.estimated_minutes} min · ${e.bpm_target} BPM` : `${e.estimated_minutes} min`}
            />
          ))}
        </List>
      )}
    </Screen>
  );
}
