import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Music, Search } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { BackLink, EmptyState, List, PageHead, Row, Screen } from "@/components/layout/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  PERIOD_LABEL,
  genreOf,
  isGenre,
  isImslpUrl,
  prefillParams,
  type FoundComposer,
  type FoundWork,
} from "@/features/repertoire/domain/catalog-search";
import { PieceFields } from "@/features/repertoire/piece-fields";
import { PieceInfo } from "@/features/repertoire/piece-info";
import { addFromCatalog, createPiece } from "@/features/repertoire/server/actions";
import { composerKeyboardWorks, searchWorks, type SearchOutcome } from "@/features/repertoire/server/open-opus";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Ajouter un morceau" };

function param(value: string | string[] | undefined, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function WorkRow({ work, q, composerId }: { work: FoundWork; q: string; composerId: string }) {
  const params = prefillParams(work);
  // Pour le lien « Choisir une autre œuvre » de l'étape suivante.
  if (composerId) params.set("compositeur_id", composerId);
  else if (q) params.set("q", q);
  return (
    <Row
      main={work.title}
      detail={[work.composer, work.period ? PERIOD_LABEL[work.period] : null, work.lifespan, work.popular ? "œuvre populaire" : null]
        .filter(Boolean)
        .join(" · ")}
    >
      <Link
        href={`/repertoire/nouveau?${params.toString()}`}
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

const MODES = [
  { id: "recherche", label: "Rechercher" },
  { id: "suggestions", label: "Suggestions" },
  { id: "fiche", label: "Saisie libre" },
] as const;
type Mode = (typeof MODES)[number]["id"];

export default async function NewPiecePage({ searchParams }: PageProps<"/repertoire/nouveau">) {
  const { supabase } = await getContext();
  const sp = await searchParams;
  const q = param(sp.q, 120);
  const composerId = param(sp.compositeur_id, 6);

  // Pré-remplissage après « Choisir » : valeurs bornées ici et revalidées à l'enregistrement.
  const partition = param(sp.partition, 500);
  const genre = param(sp.genre, 20);
  const prefill = {
    title: param(sp.titre, 200),
    composer: param(sp.compositeur, 120),
    genre: isGenre(genre) ? genre : ("other" as const),
    sourceUrl: isImslpUrl(partition) ? partition : null,
  };
  const chosen = Boolean(prefill.title);
  const mode: Mode = chosen ? "fiche" : (MODES.find((m) => m.id === sp.mode)?.id ?? "recherche");

  let outcome: (SearchOutcome & { composer?: FoundComposer }) | null = null;
  if (mode === "recherche") {
    if (composerId) outcome = await composerKeyboardWorks(composerId);
    else if (q.length >= 2) outcome = await searchWorks(q);
  }

  const suggestions =
    mode === "suggestions"
      ? await Promise.all([
          supabase.from("repertoire_catalog").select("id, title, composer, style, period, level, rights_note").order("level").order("title"),
          supabase.from("user_repertoire").select("catalog_id").not("catalog_id", "is", null),
        ]).then(([catalog, mine]) => {
          if (catalog.error || mine.error) throw new Error("Chargement des suggestions impossible.");
          const owned = new Set(mine.data.map((m) => m.catalog_id));
          return catalog.data.filter((c) => !owned.has(c.id));
        })
      : [];

  return (
    <Screen>
      <BackLink href="/repertoire" label="Répertoire" />
      <PageHead
        icon={Music}
        tint="butter"
        title="Ajouter un morceau"
        subtitle={
          chosen
            ? "Vérifie la fiche, puis ajoute."
            : "Cherche une œuvre classique, pioche dans les suggestions ou remplis la fiche toi-même."
        }
      />

      {chosen ? (
        <Link
          href={composerId ? `/repertoire/nouveau?compositeur_id=${composerId}` : q ? `/repertoire/nouveau?q=${encodeURIComponent(q)}` : "/repertoire/nouveau"}
          className="mb-5 inline-flex min-h-11 items-center gap-1.5 self-start text-[17px] text-ink-2"
        >
          <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
          Choisir une autre œuvre
        </Link>
      ) : (
        <nav aria-label="Façon d’ajouter" className="mb-6 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <Link
              key={m.id}
              href={m.id === "recherche" ? "/repertoire/nouveau" : `/repertoire/nouveau?mode=${m.id}`}
              aria-current={mode === m.id ? "page" : undefined}
              className={cn(buttonVariants({ variant: mode === m.id ? "selected" : "outline", size: "md" }))}
            >
              {m.label}
            </Link>
          ))}
        </nav>
      )}

      {mode === "recherche" ? (
        <section aria-label="Chercher une œuvre">
          <form method="get" role="search" className="flex max-w-[760px] flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 basis-64">
              <Label htmlFor="q">Compositeur ou titre</Label>
              <Input id="q" name="q" type="search" defaultValue={q} placeholder="Chopin valse la mineur, Satie…" maxLength={120} />
            </div>
            <Button type="submit" size="md">
              <Search size={18} aria-hidden />
              Chercher
            </Button>
          </form>
          <p className="mt-2 max-w-[760px] text-[15px] text-ink-2">
            Répertoire classique pour clavier. Données :{" "}
            <a className="underline underline-offset-4" href="https://openopus.org" target="_blank" rel="noreferrer">
              Open Opus
            </a>
            . Pour une musique de film ou une œuvre introuvable, passe par « Saisie libre ».
          </p>

          {outcome?.status === "unavailable" ? (
            <div className="mt-6">
              <EmptyState title="Recherche indisponible pour le moment">
                <p>
                  Le service Open Opus ne répond pas. Réessaie plus tard ou{" "}
                  <Link href="/repertoire/nouveau?mode=fiche" className="underline underline-offset-4">
                    remplis la fiche toi-même
                  </Link>
                  .
                </p>
              </EmptyState>
            </div>
          ) : outcome?.status === "ok" ? (
            <div className="mt-6">
              {outcome.composer ? (
                <p className="mb-3 text-[17px]">
                  Œuvres pour piano de <strong>{outcome.composer.name}</strong>
                  {outcome.composer.period ? ` · ${PERIOD_LABEL[outcome.composer.period]}` : ""} ({outcome.works.length})
                </p>
              ) : null}
              {outcome.works.length === 0 && outcome.composers.length === 0 ? (
                <EmptyState title="Aucune œuvre pour clavier trouvée">
                  <p>
                    Essaie le nom du compositeur seul, ou{" "}
                    <Link
                      href={`/repertoire/nouveau?${new URLSearchParams({ titre: q }).toString()}`}
                      className="underline underline-offset-4"
                    >
                      ajoute « {q} » à la main
                    </Link>
                    .
                  </p>
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
                        <WorkRow key={w.id} work={w} q={q} composerId={composerId} />
                      ))}
                    </List>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {mode === "suggestions" ? (
        <section aria-label="Suggestions">
          {suggestions.length === 0 ? (
            <EmptyState title="Tu as déjà ajouté toutes les suggestions" />
          ) : (
            <>
              <p className="mb-4 max-w-[760px] text-[17px] text-ink-2">
                Une sélection de pièces accessibles, de la plus facile à la plus difficile. Elles s’ajoutent « En cours ».
              </p>
              <List>
                {suggestions.map((c) => {
                  const g = genreOf(c.style, c.period);
                  return (
                    <Row
                      key={c.id}
                      main={c.title}
                      detail={
                        <>
                          <PieceInfo composer={c.composer} genre={g} level={c.level} />
                          <span className="mt-0.5 block">{c.rights_note}</span>
                        </>
                      }
                    >
                      <form action={addFromCatalog} className="mt-3">
                        <input type="hidden" name="id" value={c.id} />
                        <SubmitButton variant="outline" size="sm" pendingLabel="Ajout…" aria-label={`Ajouter ${c.title}`}>
                          Ajouter à mes morceaux
                        </SubmitButton>
                      </form>
                    </Row>
                  );
                })}
              </List>
            </>
          )}
        </section>
      ) : null}

      {mode === "fiche" ? (
        <section aria-label="Fiche du morceau">
          <p className="mb-4 max-w-[760px] text-[17px] text-ink-2">
            {chosen
              ? "Pré-remplie depuis la recherche : tout reste modifiable. Indique la difficulté si tu la connais."
              : "Seul le titre est obligatoire."}
          </p>
          {/* La clé force un nouveau formulaire à chaque œuvre choisie (valeurs par défaut). */}
          <ActionForm key={`${prefill.title}|${prefill.composer}`} action={createPiece}>
            <PieceFields values={prefill} withStatus />
            <SubmitButton className="mt-7" pendingLabel="Ajout…">
              Ajouter le morceau
            </SubmitButton>
          </ActionForm>
        </section>
      ) : null}
    </Screen>
  );
}
