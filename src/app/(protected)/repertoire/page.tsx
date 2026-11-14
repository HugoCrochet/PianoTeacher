import type { Metadata } from "next";
import Link from "next/link";
import { Music, Plus } from "lucide-react";
import { SubmitButton } from "@/components/forms/action-form";
import { BackLink, EmptyState, List, PageHead, Row, Screen } from "@/components/layout/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import type { PieceStatus } from "@/lib/domain/domains";
import { cn } from "@/lib/utils";
import { GENRE_LABEL, genreOf, isGenre } from "@/features/repertoire/domain/catalog-search";
import {
  SORT_LABEL,
  SORTS,
  STATUS_TABS,
  countByStatus,
  filterPieces,
  genresIn,
  isSort,
  sortPieces,
  type LibraryPiece,
} from "@/features/repertoire/domain/library";
import { setPieceStatus } from "@/features/repertoire/server/actions";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Répertoire" };

const TAB_SLUG: Record<PieceStatus, string> = {
  active: "en-cours",
  to_discover: "a-decouvrir",
  paused: "en-pause",
  completed: "termines",
};
const TAB_LABEL: Record<PieceStatus, string> = {
  active: "En cours",
  to_discover: "À découvrir",
  paused: "En pause",
  completed: "Terminés",
};
const EMPTY: Record<PieceStatus, { title: string; text: string }> = {
  active: { title: "Aucun morceau en cours", text: "Choisis un morceau « À découvrir » et lance-toi, ou ajoutes-en un nouveau." },
  to_discover: { title: "Rien en attente", text: "Ajoute les morceaux que tu aimerais jouer un jour : ils t’attendront ici." },
  paused: { title: "Aucun morceau en pause", text: "Mets un morceau en pause depuis sa fiche pour alléger ton programme." },
  completed: { title: "Aucun morceau terminé pour l’instant", text: "Les morceaux que tu marques « Terminé » apparaîtront ici." },
};
/** Au-delà, on propose la recherche et le tri. */
const TOOLS_FROM = 8;

export default async function RepertoirePage({ searchParams }: PageProps<"/repertoire">) {
  const { supabase } = await getContext();
  const sp = await searchParams;

  const { data, error } = await supabase
    .from("user_repertoire")
    .select("id, title, composer, style, period, status, level, current_step, pdf_asset_id");
  if (error) throw new Error("Chargement du répertoire impossible.");
  const pieces: LibraryPiece[] = data.map((p) => ({
    id: p.id,
    title: p.title,
    composer: p.composer,
    style: p.style,
    period: p.period,
    status: p.status as PieceStatus,
    level: p.level,
    currentStep: p.current_step,
    hasPdf: Boolean(p.pdf_asset_id),
  }));

  const counts = countByStatus(pieces);
  const requested = STATUS_TABS.find((s) => TAB_SLUG[s] === sp.onglet);
  const status: PieceStatus = requested ?? (counts.active > 0 || counts.to_discover === 0 ? "active" : "to_discover");
  const inTab = pieces.filter((p) => p.status === status);
  const genres = genresIn(inTab);
  const genre = isGenre(sp.genre) && genres.includes(sp.genre) ? sp.genre : null;
  const query = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const sort = isSort(sp.tri) ? sp.tri : "title";
  const shown = sortPieces(filterPieces(pieces, { status, genre, query }), sort);
  const filtered = Boolean(genre || query);

  /** Lien vers la liste en conservant l'état courant, sauf les clés redéfinies. */
  const href = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const state: Record<string, string | null> = {
      onglet: TAB_SLUG[status],
      genre,
      q: query || null,
      tri: sort === "title" ? null : sort,
      ...changes,
    };
    for (const [key, value] of Object.entries(state)) if (value) params.set(key, value);
    const text = params.toString();
    return text ? `/repertoire?${text}` : "/repertoire";
  };

  const tabs = STATUS_TABS.filter((s) => s === status || counts[s] > 0 || s === "active" || s === "to_discover");

  return (
    <Screen>
      <BackLink />
      <PageHead
        icon={Music}
        tint="butter"
        title="Répertoire"
        subtitle={
          pieces.length === 0
            ? "Tes morceaux, de l’envie à la maîtrise."
            : `${counts.active} en cours · ${counts.to_discover} à découvrir${counts.completed > 0 ? ` · ${counts.completed} ${counts.completed > 1 ? "terminés" : "terminé"}` : ""}`
        }
      />

      <Link href="/repertoire/nouveau" className={buttonVariants({ className: "mb-7 self-start" })}>
        <Plus size={20} aria-hidden />
        Ajouter un morceau
      </Link>

      <nav aria-label="Statut des morceaux" className="mb-5 flex flex-wrap gap-2">
        {tabs.map((s) => (
          <Link
            key={s}
            href={`/repertoire?onglet=${TAB_SLUG[s]}`}
            aria-current={status === s ? "page" : undefined}
            className={cn(buttonVariants({ variant: status === s ? "selected" : "outline", size: "md" }))}
          >
            {TAB_LABEL[s]}
            <span className={cn("tabular-nums", status === s ? "opacity-80" : "text-ink-2")}>{counts[s]}</span>
          </Link>
        ))}
      </nav>

      {status === "active" && counts.active > 3 ? (
        <p className="mb-5 max-w-[760px] text-[15px] text-ink-2">
          Avec {counts.active} morceaux en cours, chacun revient moins souvent dans ton programme. Pour avancer plus vite sur
          quelques-uns, mets les autres en pause depuis leur fiche.
        </p>
      ) : null}

      {inTab.length >= TOOLS_FROM || query ? (
        <form method="get" role="search" className="mb-4 flex max-w-[760px] flex-wrap items-end gap-3">
          <input type="hidden" name="onglet" value={TAB_SLUG[status]} />
          {genre ? <input type="hidden" name="genre" value={genre} /> : null}
          <div className="min-w-0 flex-1 basis-56">
            <Label htmlFor="q">Chercher dans mes morceaux</Label>
            <Input id="q" name="q" type="search" defaultValue={query} placeholder="Titre ou compositeur" maxLength={80} />
          </div>
          <div className="w-44">
            <Label htmlFor="tri">Trier par</Label>
            <Select id="tri" name="tri" defaultValue={sort}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="outline" size="md">
            Afficher
          </Button>
        </form>
      ) : null}

      {genres.length > 1 ? (
        <nav aria-label="Filtrer par genre" className="mb-5 flex flex-wrap gap-2">
          {[null, ...genres].map((g) => (
            <Link
              key={g ?? "tous"}
              href={href({ genre: g })}
              aria-current={genre === g ? "page" : undefined}
              className={cn(buttonVariants({ variant: genre === g ? "selected" : "outline", size: "sm" }))}
            >
              {g ? GENRE_LABEL[g] : "Tous"}
            </Link>
          ))}
        </nav>
      ) : null}

      {shown.length === 0 ? (
        filtered ? (
          <EmptyState title="Aucun morceau ne correspond">
            <p>
              Essaie un autre mot ou{" "}
              <Link href={`/repertoire?onglet=${TAB_SLUG[status]}`} className="underline underline-offset-4">
                retire les filtres
              </Link>
              .
            </p>
          </EmptyState>
        ) : (
          <EmptyState title={EMPTY[status].title}>
            <p>{EMPTY[status].text}</p>
          </EmptyState>
        )
      ) : (
        <>
          {filtered ? (
            <p className="mb-2 text-[15px] text-ink-2" role="status">
              {shown.length} {shown.length > 1 ? "morceaux" : "morceau"} sur {inTab.length}
            </p>
          ) : null}
          <List>
            {shown.map((p) => {
              const g = genreOf(p.style, p.period);
              return (
                <Row
                  key={p.id}
                  main={
                    <Link href={`/repertoire/${p.id}`} className="block py-0.5 underline-offset-4 hover:underline">
                      {p.title}
                    </Link>
                  }
                  detail={[
                    p.composer,
                    g !== "other" ? GENRE_LABEL[g] : null,
                    p.level ? `difficulté ${p.level} sur 5` : null,
                    p.hasPdf ? "partition" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  meta={
                    status === "to_discover" || status === "paused" ? (
                      <form action={setPieceStatus}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value="active" />
                        <SubmitButton
                          variant="outline"
                          size="sm"
                          className="text-ink"
                          pendingLabel="…"
                          aria-label={`${status === "paused" ? "Reprendre" : "Commencer"} ${p.title}`}
                        >
                          {status === "paused" ? "Reprendre" : "Commencer"}
                        </SubmitButton>
                      </form>
                    ) : status === "active" && p.currentStep ? (
                      p.currentStep
                    ) : undefined
                  }
                />
              );
            })}
          </List>
        </>
      )}
    </Screen>
  );
}
