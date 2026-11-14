import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Music } from "lucide-react";
import { z } from "zod";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { BackLink, Disclosure, List, PageHead, Panel, Row, Screen, SectionTitle } from "@/components/layout/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatShortDate } from "@/lib/dates";
import { PIECE_STATUS_LABEL, RESULT_LABEL, type PieceStatus, type PracticeResult } from "@/lib/domain/domains";
import { GENRE_LABEL, genreOf, isImslpUrl } from "@/features/repertoire/domain/catalog-search";
import { STATUS_TABS } from "@/features/repertoire/domain/library";
import { getContext } from "@/features/profile/server/profile";
import { PdfUpload } from "@/features/repertoire/pdf-upload";
import { PieceFields } from "@/features/repertoire/piece-fields";
import { Input, Label } from "@/components/ui/field";
import {
  PASSAGE_STATUS_LABEL,
  lastBpm,
  passageStatus,
  type PassageLog,
} from "@/features/repertoire/domain/passages";
import {
  addPassage,
  deletePassage,
  deletePdf,
  deletePiece,
  setPieceStatus,
  splitPassages,
  updatePiece,
} from "@/features/repertoire/server/actions";

export const metadata: Metadata = { title: "Morceau" };

export default async function PiecePage({ params, searchParams }: PageProps<"/repertoire/[id]">) {
  const { id } = await params;
  const justAdded = (await searchParams).nouveau === "1";
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, user } = await getContext();
  const { data: piece } = await supabase
    .from("user_repertoire")
    .select("*, pdf:pdf_assets ( original_filename, size_bytes, created_at )")
    .eq("id", id)
    .maybeSingle();
  if (!piece) notFound();
  const [logs, passages, passageLogs] = await Promise.all([
    supabase
      .from("practice_logs")
      .select("id, practice_date, bpm, result, passage:piece_passages ( label )")
      .eq("user_repertoire_id", piece.id)
      .order("practiced_at", { ascending: false })
      .limit(10),
    supabase.from("piece_passages").select("id, position, label, target_bpm").eq("user_repertoire_id", piece.id).order("position"),
    supabase
      .from("practice_logs")
      .select("passage_id, practice_date, result, bpm")
      .eq("user_repertoire_id", piece.id)
      .not("passage_id", "is", null)
      .order("practiced_at", { ascending: true }),
  ]);
  if (passages.error || passageLogs.error) throw new Error("Chargement des passages impossible.");
  const logsByPassage = new Map<string, PassageLog[]>();
  for (const l of passageLogs.data) {
    const entry: PassageLog = { passageId: l.passage_id, date: l.practice_date, result: l.result as PassageLog["result"], bpm: l.bpm };
    logsByPassage.set(l.passage_id ?? "", [...(logsByPassage.get(l.passage_id ?? "") ?? []), entry]);
  }

  const genre = genreOf(piece.style, piece.period);
  const status = piece.status as PieceStatus;
  const history = logs.data ?? [];

  return (
    <Screen>
      <BackLink href="/repertoire" label="Répertoire" />
      <PageHead
        icon={Music}
        tint="butter"
        title={piece.title}
        subtitle={[
          piece.composer,
          genre !== "other" ? GENRE_LABEL[genre] : null,
          piece.level ? `difficulté ${piece.level} sur 5` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      {justAdded ? (
        <div className="mb-6">
          <Panel title="Morceau ajouté">
            <p>
              {piece.pdf
                ? "Tout est prêt."
                : "Il ne manque plus que la partition : trouve une édition libre de droits, télécharge le PDF, puis importe-le ci-dessous."}
            </p>
          </Panel>
        </div>
      ) : null}

      <form action={setPieceStatus} className="max-w-[760px]">
        <input type="hidden" name="id" value={piece.id} />
        <fieldset>
          <legend className="mb-1.5 text-[15px] text-ink-2">Statut</legend>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((s) => (
              <Button
                key={s}
                type="submit"
                name="status"
                value={s}
                size="md"
                variant={status === s ? "selected" : "outline"}
                aria-pressed={status === s}
              >
                {status === s ? "✓ " : ""}
                {PIECE_STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </fieldset>
        <p className="mt-2 text-[15px] text-ink-2">
          {status === "active"
            ? "Ce morceau fait partie de ton programme."
            : "Seuls les morceaux « En cours » entrent dans ton programme."}
        </p>
      </form>

      {piece.notes ? (
        <p className="mt-5 max-w-[760px] text-[17px] whitespace-pre-line">
          <span className="text-ink-2">Notes : </span>
          {piece.notes}
        </p>
      ) : null}

      <div id="partition" className="scroll-mt-6">
        <SectionTitle>Partition</SectionTitle>
      </div>
      {piece.pdf ? (
        <>
          <div className="mb-4 max-w-[760px]">
            <a
              href={`/repertoire/${piece.id}/partition`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ className: "self-start" })}
            >
              Ouvrir la partition
            </a>
            <p className="mt-3 text-[15px] text-ink-2">
              {piece.pdf.original_filename} ·{" "}
              {piece.pdf.size_bytes < 104_858 ? "moins de 0,1" : (piece.pdf.size_bytes / 1_048_576).toFixed(1).replace(".", ",")} Mo · ajoutée
              le{" "}
              {formatShortDate(piece.pdf.created_at.slice(0, 10))}
            </p>
          </div>
          <div className="max-w-[760px] border-t-[1.5px] border-line">
            <Disclosure summary="Remplacer ou supprimer la partition">
              <PdfUpload pieceId={piece.id} userId={user.id} hasPdf />
              <ActionForm action={deletePdf} className="mt-7">
                <input type="hidden" name="id" value={piece.id} />
                <p className="mb-1 text-[17px] font-bold">Supprimer la partition</p>
                <label className="flex min-h-11 items-center gap-3 text-[17px]">
                  <input type="checkbox" name="confirm" className="size-5 flex-none accent-ink" />
                  Je confirme : le fichier PDF sera supprimé, le morceau et son historique restent.
                </label>
                <SubmitButton variant="danger" size="md" className="mt-2" pendingLabel="Suppression…">
                  Supprimer la partition
                </SubmitButton>
              </ActionForm>
            </Disclosure>
          </div>
        </>
      ) : (
        <>
          {isImslpUrl(piece.source_url) ? (
            <div className="mb-6 max-w-[760px]">
              <a
                href={piece.source_url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "md" })}
              >
                Trouver la partition sur IMSLP
              </a>
              <p className="mt-2 text-[15px] text-ink-2">
                Choisis une édition marquée libre de droits dans ton pays (mention « Public Domain » ; évite « Non-PD EU »),
                télécharge le PDF, puis importe-le ici.
              </p>
            </div>
          ) : null}
          <PdfUpload pieceId={piece.id} userId={user.id} hasPdf={false} />
        </>
      )}
      {piece.source_url && !isImslpUrl(piece.source_url) ? (
        <p className="mt-4 max-w-[760px] text-[17px]">
          <a href={piece.source_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            Ouvrir le lien enregistré
          </a>
        </p>
      ) : null}

      <SectionTitle>Passages</SectionTitle>
      <p className="mb-4 max-w-[760px] text-[17px] text-ink-2">
        {passages.data.length > 0
          ? "Le programme propose chaque jour le passage le plus fragile."
          : "Découpe le morceau en passages : le programme proposera chaque jour le plus fragile."}
      </p>
      {passages.data.length > 0 ? (
        <List>
          {passages.data.map((p) => {
            const own = logsByPassage.get(p.id) ?? [];
            const bpm = lastBpm(own);
            const last = own[own.length - 1];
            return (
              <Row
                key={p.id}
                main={p.label}
                detail={[
                  PASSAGE_STATUS_LABEL[passageStatus(own)],
                  last ? `dernier essai le ${formatShortDate(last.date)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                meta={
                  bpm && p.target_bpm
                    ? `${bpm} sur ${p.target_bpm} visés`
                    : bpm
                      ? `${bpm} BPM`
                      : p.target_bpm
                        ? `${p.target_bpm} BPM visés`
                        : undefined
                }
              />
            );
          })}
        </List>
      ) : null}
      <div className={passages.data.length > 0 ? "max-w-[760px]" : "max-w-[760px] border-t-[1.5px] border-line"}>
        <Disclosure summary="Découper par mesures" defaultOpen={passages.data.length === 0}>
          <ActionForm action={splitPassages}>
            <input type="hidden" name="pieceId" value={piece.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="split-total">Nombre de mesures du morceau</Label>
                <Input id="split-total" name="totalMeasures" type="number" inputMode="numeric" min={1} max={500} required />
              </div>
              <div>
                <Label htmlFor="split-size">Mesures par passage</Label>
                <Input id="split-size" name="size" type="number" inputMode="numeric" min={1} max={64} defaultValue={8} required />
              </div>
            </div>
            <SubmitButton variant="outline" size="md" className="mt-5" pendingLabel="Découpage…">
              Découper
            </SubmitButton>
          </ActionForm>
        </Disclosure>
        <Disclosure summary="Ajouter un passage à la main">
          <ActionForm action={addPassage}>
            <input type="hidden" name="pieceId" value={piece.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="passage-label">Nom du passage</Label>
                <Input id="passage-label" name="label" maxLength={80} placeholder="Mesures 9–16, coda…" required />
              </div>
              <div>
                <Label htmlFor="passage-bpm">Tempo visé (optionnel)</Label>
                <Input id="passage-bpm" name="targetBpm" type="number" inputMode="numeric" min={20} max={300} />
              </div>
            </div>
            <SubmitButton variant="outline" size="md" className="mt-5" pendingLabel="Ajout…">
              Ajouter le passage
            </SubmitButton>
          </ActionForm>
        </Disclosure>
        {passages.data.length > 0 ? (
          <Disclosure summary="Supprimer un passage">
            <p className="mb-3 text-[15px] text-ink-2">L’historique des séances est conservé.</p>
            <ul className="space-y-2">
              {passages.data.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 text-[17px]">
                  <span>{p.label}</span>
                  <form action={deletePassage}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton variant="danger" size="sm" pendingLabel="Suppression…" aria-label={`Supprimer le passage ${p.label}`}>
                      Supprimer
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          </Disclosure>
        ) : null}
      </div>

      <SectionTitle>Historique</SectionTitle>
      {history.length === 0 ? (
        <p className="text-[17px] text-ink-2">Pas encore travaillé. Passe le morceau « En cours » pour qu’il entre dans ton programme.</p>
      ) : (
        <List>
          {history.map((l) => (
            <Row
              key={l.id}
              main={RESULT_LABEL[l.result as PracticeResult]}
              detail={[formatShortDate(l.practice_date), l.passage?.label].filter(Boolean).join(" · ")}
              meta={l.bpm ? `${l.bpm} BPM` : undefined}
            />
          ))}
        </List>
      )}

      <SectionTitle>Fiche</SectionTitle>
      <div className="max-w-[760px] border-t-[1.5px] border-line">
        <Disclosure summary="Modifier la fiche">
          <ActionForm action={updatePiece}>
            <input type="hidden" name="id" value={piece.id} />
            <PieceFields
              values={{
                title: piece.title,
                composer: piece.composer,
                genre,
                level: piece.level,
                currentStep: piece.current_step,
                notes: piece.notes,
                sourceUrl: piece.source_url,
              }}
            />
            <SubmitButton className="mt-7" pendingLabel="Enregistrement…">
              Enregistrer
            </SubmitButton>
          </ActionForm>
        </Disclosure>
        <Disclosure summary="Supprimer ce morceau">
          <ActionForm action={deletePiece}>
            <input type="hidden" name="id" value={piece.id} />
            <label className="flex min-h-11 items-center gap-3 text-[17px]">
              <input type="checkbox" name="confirm" className="size-5 flex-none accent-ink" />
              Je confirme : la fiche, sa partition et son historique seront supprimés.
            </label>
            <SubmitButton variant="danger" size="md" className="mt-2" pendingLabel="Suppression…">
              Supprimer définitivement
            </SubmitButton>
          </ActionForm>
        </Disclosure>
      </div>
    </Screen>
  );
}
