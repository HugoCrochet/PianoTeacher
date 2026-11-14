import type { Metadata } from "next";
import Link from "next/link";
import { Music, Search } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { BackLink, EmptyState, List, PageHead, Row, Screen, SectionTitle } from "@/components/layout/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import {
  PERIOD_LABEL,
  isImslpUrl,
  isPeriod,
  prefillParams,
  type FoundComposer,
  type FoundWork,
} from "@/features/repertoire/domain/catalog-search";
import { PieceFields } from "@/features/repertoire/piece-fields";
import { createPiece } from "@/features/repertoire/server/actions";
import { composerKeyboardWorks, searchWorks, type SearchOutcome } from "@/features/repertoire/server/open-opus";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Ajouter un morceau" };

function param(value: string | string[] | undefined, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function WorkRow({ work, q }: { work: FoundWork; q: string }) {
  const params = prefillParams(work);
  if (q) params.set("q", q);
  return (
    <Row
      main={work.title}
      detail={[work.composer, work.period ? PERIOD_LABEL[work.period] : null, work.lifespan, work.popular ? "œuvre populaire" : null]
        .filter(Boolean)
        .join(" · ")}
    >
      <Link
        href={`/repertoire/nouveau?${params.toString()}#formulaire`}
        className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}
        aria-label={`Choisir ${work.title}`}
      >
        Choisir
      </Link>
    </Row>
  );
}

function ComposerRow({ composer }: { composer: FoundComposer }) {
  return (
    <Row
      main={composer.name}
      detail={[composer.period ? PERIOD_LABEL[composer.period] : null, composer.lifespan].filter(Boolean).join(" · ")}
    >
      <Link
        href={`/repertoire/nouveau?compositeur_id=${composer.id}`}
        className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}
      >
        Voir ses œuvres pour piano
      </Link>
    </Row>
  );
}

export default async function NewPiecePage({ searchParams }: PageProps<"/repertoire/nouveau">) {
  await getContext(); // page privée : session vérifiée côté serveur
  const sp = await searchParams;
  const q = param(sp.q, 120);
  const composerId = param(sp.compositeur_id, 6);

  let outcome: (SearchOutcome & { composer?: FoundComposer }) | null = null;
  if (composerId) outcome = await composerKeyboardWorks(composerId);
  else if (q.length >= 2) outcome = await searchWorks(q);

  // Pré-remplissage après « Choisir » : valeurs bornées et revalidées à l'enregistrement.
  const partition = param(sp.partition, 500);
  const courant = param(sp.courant, 30);
  const prefill = {
    title: param(sp.titre, 200),
    composer: param(sp.compositeur, 120),
    period: isPeriod(courant) ? courant : null,
    sourceUrl: isImslpUrl(partition) ? partition : null,
    style: "classical",
    status: "active",
  };
  const chosen = Boolean(prefill.title);

  return (
    <Screen>
      <BackLink href="/repertoire" label="Répertoire" />
      <PageHead
        icon={Music}
        tint="butter"
        title="Ajouter un morceau"
        subtitle="Cherche une œuvre pour remplir la fiche, ou remplis-la toi-même."
      />

      <section aria-labelledby="recherche-titre">
        <h2 id="recherche-titre" className="sr-only">
          Chercher une œuvre
        </h2>
        <form method="get" role="search" className="flex max-w-[760px] flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <Label htmlFor="q">Chercher une œuvre (compositeur ou titre)</Label>
            <Input id="q" name="q" type="search" defaultValue={q} placeholder="Chopin valse la mineur, Satie…" maxLength={120} />
          </div>
          <Button type="submit" variant="outline" size="md">
            <Search size={18} aria-hidden />
            Chercher
          </Button>
        </form>
        <p className="mt-2 max-w-[760px] text-[15px] text-ink-2">
          Répertoire classique pour clavier. Données : <a className="underline underline-offset-4" href="https://openopus.org" target="_blank" rel="noreferrer">Open Opus</a>.
          La musique de film et les œuvres absentes s’ajoutent à la main.
        </p>

        {outcome?.status === "unavailable" ? (
          <div className="mt-5">
            <EmptyState title="Recherche indisponible pour le moment">
              <p>Le service Open Opus ne répond pas. Ajoute le morceau à la main ci-dessous, ou réessaie plus tard.</p>
            </EmptyState>
          </div>
        ) : outcome?.status === "ok" ? (
          <div className="mt-5">
            {outcome.composer ? (
              <p className="mb-3 text-[17px]">
                Œuvres pour piano de <strong>{outcome.composer.name}</strong>
                {outcome.composer.period ? ` · ${PERIOD_LABEL[outcome.composer.period]}` : ""}
              </p>
            ) : null}
            {outcome.works.length === 0 && outcome.composers.length === 0 ? (
              <EmptyState title="Aucune œuvre pour clavier trouvée">
                <p>Essaie le nom du compositeur seul, ou ajoute le morceau à la main ci-dessous.</p>
              </EmptyState>
            ) : (
              <>
                {outcome.composers.length > 0 ? (
                  <List className="mb-5">
                    {outcome.composers.map((c) => (
                      <ComposerRow key={c.id} composer={c} />
                    ))}
                  </List>
                ) : null}
                {outcome.works.length > 0 ? (
                  <List>
                    {outcome.works.map((w) => (
                      <WorkRow key={w.id} work={w} q={q} />
                    ))}
                  </List>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="formulaire-titre" id="formulaire">
        <SectionTitle>
          <span id="formulaire-titre">{chosen ? "Vérifie la fiche" : "Fiche du morceau"}</span>
        </SectionTitle>
        {chosen ? (
          <p className="mb-4 max-w-[760px] text-[17px] text-ink-2">
            Pré-remplie depuis la recherche. Indique la difficulté estimée si tu la connais, puis ajoute.
          </p>
        ) : (
          <p className="mb-4 max-w-[760px] text-[17px] text-ink-2">Seul le titre est obligatoire.</p>
        )}
        {/* La clé force un nouveau formulaire à chaque choix d'œuvre (valeurs par défaut). */}
        <ActionForm key={`${prefill.title}|${prefill.composer}`} action={createPiece}>
          <PieceFields values={prefill} />
          <SubmitButton className="mt-7" pendingLabel="Ajout…">
            Ajouter
          </SubmitButton>
        </ActionForm>
      </section>
    </Screen>
  );
}
