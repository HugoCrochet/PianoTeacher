import "server-only";
import { effectiveKey, keyCoverage, type KeyCoverage, type KeyLog } from "@/lib/domain/keys";
import type { ServerClient } from "@/lib/supabase/server";

/** Couverture des 24 tonalités d'après les résultats réels en gammes et harmonie. */
export async function loadKeyCoverage(supabase: ServerClient): Promise<Map<string, KeyCoverage>> {
  const { data, error } = await supabase
    .from("practice_logs")
    .select("domain, key_signature, practice_date, result, exercise:exercises ( key_signature )")
    .eq("domain", "scales_harmony")
    .order("practiced_at", { ascending: true });
  if (error) throw new Error(`Chargement des tonalités impossible : ${error.message}`);
  const logs: KeyLog[] = data.flatMap((l) => {
    const key = effectiveKey(l.domain, l.key_signature, l.exercise?.key_signature ?? null);
    return key ? [{ key, date: l.practice_date, result: l.result as KeyLog["result"] }] : [];
  });
  return keyCoverage(logs);
}
