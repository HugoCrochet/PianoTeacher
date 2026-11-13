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
