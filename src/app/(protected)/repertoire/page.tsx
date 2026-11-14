import type { Metadata } from "next";
import Link from "next/link";
import { Music } from "lucide-react";
import { SubmitButton } from "@/components/forms/action-form";
import { BackLink, EmptyState, List, PageHead, Row, Screen } from "@/components/layout/page";
import { buttonVariants } from "@/components/ui/button";
import { PIECE_STATUS_LABEL, STYLE_LABEL, type PieceStatus, type Style } from "@/lib/domain/domains";
import { PERIOD_LABEL, PERIODS, isPeriod, type Period } from "@/features/repertoire/domain/catalog-search";
import { cn } from "@/lib/utils";
import { addFromCatalog } from "@/features/repertoire/server/actions";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Répertoire" };

const TABS = [
  { id: "en-cours", label: "En cours" },
  { id: "suggestions", label: "Suggestions" },
  { id: "termines", label: "Terminés" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function RepertoirePage({ searchParams }: PageProps<"/repertoire">) {
  const { supabase } = await getContext();
  const sp = await searchParams;
  const param = sp.onglet;
  const tab: Tab = TABS.some((t) => t.id === param) ? (param as Tab) : "en-cours";
  const period: Period | null = isPeriod(sp.courant) ? sp.courant : null;

  const [pieces, catalog] = await Promise.all([
    supabase
      .from("user_repertoire")
      .select("id, catalog_id, title, composer, period, status, current_step, pdf_asset_id")
      .order("title"),
    supabase.from("repertoire_catalog").select("id, title, composer, style, level, period, rights_note").order("level").order("title"),
  ]);
  if (pieces.error || catalog.error) throw new Error("Chargement du répertoire impossible.");

  const active = pieces.data.filter((p) => p.status === "active").length;
  const inTab = pieces.data.filter((p) => (tab === "termines" ? p.status === "completed" : p.status !== "completed"));
  // Filtre par courant : seulement les courants présents dans l'onglet.
  const periods = PERIODS.filter((x) => inTab.some((p) => p.period === x));
  const mine = inTab
    .filter((p) => !period || p.period === period)
    .sort((a, b) => Number(b.status === "active") - Number(a.status === "active"));
  const owned = new Set(pieces.data.map((p) => p.catalog_id));
  // Classique d'abord, puis musiques de film (docs/PRODUCT.md §5).
  const suggestions = catalog.data
    .filter((c) => !owned.has(c.id))
    .sort((a, b) => Number(a.style !== "classical") - Number(b.style !== "classical"));

  return (
    <Screen>
      <BackLink />
      <PageHead
        icon={Music}
        tint="butter"
        title="Répertoire"
        subtitle={active > 0 ? `${active} ${active > 1 ? "morceaux" : "morceau"} en cours.` : "Aucun morceau en cours."}
      />

      <nav aria-label="Onglets du répertoire" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "en-cours" ? "/repertoire" : `/repertoire?onglet=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(buttonVariants({ variant: tab === t.id ? "selected" : "outline", size: "md" }))}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "suggestions" ? (
        suggestions.length === 0 ? (
          <EmptyState title="Tu as déjà ajouté toutes les suggestions" />
        ) : (
          <List>
            {suggestions.map((c) => (
              <Row
                key={c.id}
                main={c.title}
                detail={
                  <>
                    {[c.composer, isPeriod(c.period) ? PERIOD_LABEL[c.period] : STYLE_LABEL[c.style as Style]].join(" · ")} ·
                    difficulté {c.level} sur 5
                    <span className="block">{c.rights_note}</span>
                  </>
                }
              >
                <form action={addFromCatalog} className="mt-3">
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="outline" size="sm" pendingLabel="Ajout…">
                    Ajouter à mes morceaux
                  </SubmitButton>
                </form>
              </Row>
            ))}
          </List>
        )
      ) : (
        <>
          {periods.length > 1 ? (
            <nav aria-label="Filtrer par courant" className="mb-5 flex flex-wrap gap-2">
              {[null, ...periods].map((x) => {
                const href = `/repertoire?${new URLSearchParams({
                  ...(tab !== "en-cours" ? { onglet: tab } : {}),
                  ...(x ? { courant: x } : {}),
                }).toString()}`;
                return (
                  <Link
                    key={x ?? "tous"}
                    href={href}
                    aria-current={period === x ? "page" : undefined}
                    className={cn(buttonVariants({ variant: period === x ? "selected" : "outline", size: "sm" }))}
                  >
                    {x ? PERIOD_LABEL[x] : "Tous les courants"}
                  </Link>
                );
              })}
            </nav>
          ) : null}
          {mine.length === 0 ? (
            <EmptyState title={tab === "termines" ? "Aucun morceau terminé pour l’instant" : "Aucun morceau pour l’instant"}>
              <p>
                {tab === "termines"
                  ? "Les pièces que tu marques « Terminé » apparaîtront ici."
                  : "Ajoute un morceau personnel ou pioche dans les suggestions."}
              </p>
            </EmptyState>
          ) : (
            <List>
              {mine.map((p) => (
                <Row
                  key={p.id}
                  main={
                    <Link href={`/repertoire/${p.id}`} className="underline-offset-4 hover:underline">
                      {p.title}
                    </Link>
                  }
                  detail={[p.composer, isPeriod(p.period) ? PERIOD_LABEL[p.period] : null, p.pdf_asset_id ? "partition PDF" : null]
                    .filter(Boolean)
                    .join(" · ")}
                  meta={
                    p.status === "active" && p.current_step ? p.current_step : PIECE_STATUS_LABEL[p.status as PieceStatus]
                  }
                />
              ))}
            </List>
          )}
        </>
      )}

      <Link href="/repertoire/nouveau" className={buttonVariants({ className: "mt-7 self-start" })}>
        Ajouter un morceau
      </Link>
    </Screen>
  );
}
