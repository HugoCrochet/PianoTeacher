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
import { deletePdf, deletePiece, updatePiece } from "@/features/repertoire/server/actions";

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
  const logs = await supabase
    .from("practice_logs")
    .select("id, practice_date, bpm, result")
    .eq("user_repertoire_id", piece.id)
    .order("practiced_at", { ascending: false })
    .limit(10);

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
              detail={formatShortDate(l.practice_date)}
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
