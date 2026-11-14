import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BackLink, EmptyState, Screen } from "@/components/layout/page";
import { getContext } from "@/features/profile/server/profile";
import { ScoreReader } from "@/features/repertoire/score-reader";
import { signedScoreUrl } from "@/features/repertoire/server/pdf";

export const metadata: Metadata = { title: "Partition" };

export default async function ScorePage({ params }: PageProps<"/repertoire/[id]/lecture">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await getContext();
  const [piece, score] = await Promise.all([
    supabase.from("user_repertoire").select("title, composer").eq("id", id).maybeSingle(),
    signedScoreUrl(supabase, id),
  ]);
  if (!piece.data || !score) notFound();

  return (
    <Screen className="max-w-none md:px-8">
      <BackLink href={`/repertoire/${id}`} label={piece.data.title} />
      <h1 className="sr-only">Partition : {piece.data.title}</h1>
      {score === "error" ? (
        <EmptyState title="Partition indisponible pour le moment">
          <p>Réessaie dans un instant.</p>
        </EmptyState>
      ) : (
        <ScoreReader url={score.url} fallbackHref={`/repertoire/${id}/partition`} />
      )}
    </Screen>
  );
}
