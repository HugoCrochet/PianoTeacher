import type { Metadata } from "next";
import { Music } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { BackLink, PageHead, Screen } from "@/components/layout/page";
import { PieceFields } from "@/features/repertoire/piece-fields";
import { createPiece } from "@/features/repertoire/server/actions";

export const metadata: Metadata = { title: "Ajouter un morceau" };

export default function NewPiecePage() {
  return (
    <Screen>
      <BackLink href="/repertoire" label="Répertoire" />
      <PageHead icon={Music} tint="butter" title="Ajouter un morceau" subtitle="Seul le titre est obligatoire." />
      <ActionForm action={createPiece}>
        <PieceFields />
        <SubmitButton className="mt-7" pendingLabel="Ajout…">
          Ajouter
        </SubmitButton>
      </ActionForm>
    </Screen>
  );
}
