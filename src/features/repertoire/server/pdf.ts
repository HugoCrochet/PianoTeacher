import "server-only";
import type { ServerClient } from "@/lib/supabase/server";

export const SCORES_BUCKET = "personal-scores";

/** Chemin de stockage : `<user_id>/<uuid>.pdf`. Jamais construit à partir d'un nom de fichier. */
export function scorePath(userId: string, assetId: string): string {
  return `${userId}/${assetId}.pdf`;
}

/**
 * Supprime le fichier puis sa ligne de métadonnées.
 * Si la suppression du fichier échoue, rien n'est modifié en base : on peut réessayer.
 */
export async function removeScore(supabase: ServerClient, assetId: string): Promise<boolean> {
  const asset = await supabase.from("pdf_assets").select("id, storage_path").eq("id", assetId).maybeSingle();
  if (!asset.data) return true;
  const removed = await supabase.storage.from(SCORES_BUCKET).remove([asset.data.storage_path]);
  if (removed.error) return false;
  await supabase.from("user_repertoire").update({ pdf_asset_id: null }).eq("pdf_asset_id", assetId);
  const deleted = await supabase.from("pdf_assets").delete().eq("id", assetId);
  return !deleted.error;
}

/** Durée de validité d'une URL signée de partition (secondes). */
export const SIGNED_URL_SECONDS = 300;

/**
 * URL signée de courte durée vers la partition d'un morceau, ou null si le morceau n'a pas
 * de partition (la RLS limite la lecture aux morceaux de l'utilisateur connecté).
 */
export async function signedScoreUrl(
  supabase: ServerClient,
  pieceId: string,
): Promise<{ url: string; filename: string } | null | "error"> {
  const piece = await supabase
    .from("user_repertoire")
    .select("pdf:pdf_assets ( storage_path, original_filename )")
    .eq("id", pieceId)
    .maybeSingle();
  const pdf = piece.data?.pdf;
  if (!pdf) return null;
  const signed = await supabase.storage.from(SCORES_BUCKET).createSignedUrl(pdf.storage_path, SIGNED_URL_SECONDS);
  if (signed.error || !signed.data) return "error";
  return { url: signed.data.signedUrl, filename: pdf.original_filename };
}
