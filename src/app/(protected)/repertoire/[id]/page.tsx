import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Music } from "lucide-react";
import { z } from "zod";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { BackLink, List, PageHead, Row, Screen, SectionTitle } from "@/components/layout/page";
import { buttonVariants } from "@/components/ui/button";
import { formatShortDate } from "@/lib/dates";
import { PIECE_STATUS_LABEL, RESULT_LABEL, TIER_LABEL, type PieceStatus, type PracticeResult, type Tier } from "@/lib/domain/domains";
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
  splitPassages,
  updatePiece,
} from "@/features/repertoire/server/actions";

export const metadata: Metadata = { title: "Morceau" };

export default async function PiecePage({ params }: PageProps<"/repertoire/[id]">) {
  const { id } = await params;
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

  return (
    <Screen>
      <BackLink href="/repertoire" label="Répertoire" />
      <PageHead
        icon={Music}
        tint="butter"
        title={piece.title}
        subtitle={[piece.composer, PIECE_STATUS_LABEL[piece.status as PieceStatus], TIER_LABEL[piece.tier as Tier]]
          .filter(Boolean)
          .join(" · ")}
      />

      <SectionTitle>Partition</SectionTitle>
      {piece.pdf ? (
        <div className="mb-5 max-w-[760px]">
          <p className="text-[17px]">
            {piece.pdf.original_filename}
            <span className="block text-[15px] text-ink-2">
              PDF · {(piece.pdf.size_bytes / 1_048_576).toFixed(1).replace(".", ",")} Mo · ajouté le{" "}
              {formatShortDate(piece.pdf.created_at.slice(0, 10))}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <a
              href={`/repertoire/${piece.id}/partition`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ size: "md" })}
            >
              Ouvrir la partition
            </a>
            <ActionForm action={deletePdf}>
              <input type="hidden" name="id" value={piece.id} />
              <SubmitButton variant="danger" size="md" pendingLabel="Suppression…">
                Supprimer la partition
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      ) : null}
      <PdfUpload pieceId={piece.id} userId={user.id} hasPdf={Boolean(piece.pdf)} />

      <SectionTitle>Passages</SectionTitle>
      <p className="mb-4 max-w-[760px] text-[17px] text-ink-2">
        Découpe le morceau : le programme proposera chaque jour le passage le plus fragile.
      </p>
      {passages.data.length > 0 ? (
        <List className="mb-6">
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
                        : "—"
                }
              >
                <form action={deletePassage} className="mt-2">
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton variant="ghost" size="sm" className="-ml-4" pendingLabel="Suppression…" aria-label={`Supprimer le passage ${p.label}`}>
                    Supprimer
                  </SubmitButton>
                </form>
              </Row>
            );
          })}
        </List>
      ) : null}
      <div className="grid max-w-[760px] gap-8 md:grid-cols-2">
        <ActionForm action={addPassage}>
          <input type="hidden" name="pieceId" value={piece.id} />
          <p className="mb-3 text-[19px] font-bold">Ajouter un passage</p>
          <Label htmlFor="passage-label">Nom du passage</Label>
          <Input id="passage-label" name="label" maxLength={80} placeholder="Mesures 9–16" required />
          <Label htmlFor="passage-bpm" className="mt-4">
            Tempo visé (optionnel)
          </Label>
          <Input id="passage-bpm" name="targetBpm" type="number" inputMode="numeric" min={20} max={300} />
          <SubmitButton variant="outline" size="md" className="mt-5" pendingLabel="Ajout…">
            Ajouter
          </SubmitButton>
        </ActionForm>
        <ActionForm action={splitPassages}>
          <input type="hidden" name="pieceId" value={piece.id} />
          <p className="mb-3 text-[19px] font-bold">Découper par mesures</p>
          <Label htmlFor="split-total">Nombre de mesures du morceau</Label>
          <Input id="split-total" name="totalMeasures" type="number" inputMode="numeric" min={1} max={500} required />
          <Label htmlFor="split-size" className="mt-4">
            Mesures par passage
          </Label>
          <Input id="split-size" name="size" type="number" inputMode="numeric" min={1} max={64} defaultValue={8} required />
          <SubmitButton variant="outline" size="md" className="mt-5" pendingLabel="Découpage…">
            Découper
          </SubmitButton>
        </ActionForm>
      </div>

      <SectionTitle>Fiche</SectionTitle>
      <ActionForm action={updatePiece}>
        <input type="hidden" name="id" value={piece.id} />
        <PieceFields
          values={{
            title: piece.title,
            composer: piece.composer,
            style: piece.style,
            tier: piece.tier,
            status: piece.status,
            level: piece.level,
            feltDifficulty: piece.felt_difficulty,
            currentStep: piece.current_step,
            notes: piece.notes,
            sourceUrl: piece.source_url,
          }}
        />
        <SubmitButton className="mt-7" pendingLabel="Enregistrement…">
          Enregistrer
        </SubmitButton>
      </ActionForm>

      <SectionTitle>Historique</SectionTitle>
      {(logs.data ?? []).length === 0 ? (
        <p className="text-[17px] text-ink-2">Pas encore travaillé.</p>
      ) : (
        <List>
          {(logs.data ?? []).map((l) => (
            <Row
              key={l.id}
              main={RESULT_LABEL[l.result as PracticeResult]}
              detail={[formatShortDate(l.practice_date), l.passage?.label].filter(Boolean).join(" · ")}
              meta={l.bpm ? `${l.bpm} BPM` : "—"}
            />
          ))}
        </List>
      )}

      <SectionTitle>Supprimer ce morceau</SectionTitle>
      <ActionForm action={deletePiece} className="max-w-[760px]">
        <input type="hidden" name="id" value={piece.id} />
        <label className="flex min-h-11 items-center gap-3 text-[17px]">
          <input type="checkbox" name="confirm" className="size-5 accent-ink" />
          Je confirme : la fiche, sa partition et son historique seront supprimés.
        </label>
        <SubmitButton variant="danger" size="md" className="mt-2" pendingLabel="Suppression…">
          Supprimer définitivement
        </SubmitButton>
      </ActionForm>
    </Screen>
  );
}
