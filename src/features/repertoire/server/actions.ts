"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { done, fail, type ActionState } from "@/lib/action";
import { weekStartOf } from "@/lib/dates";
import {
  firstError,
  idSchema,
  PDF_MAX_BYTES,
  pdfRegisterSchema,
  pieceSchema,
  pieceUpdateSchema,
} from "@/lib/validation/schemas";
import { regenerateWeek } from "@/features/planner/server/plan-service";
import { getContext, type AppContext } from "@/features/profile/server/profile";
import { removeScore, scorePath, SCORES_BUCKET } from "./pdf";

/** Les pièces en cours ont changé : on réajuste les jours à venir, sans toucher au manuel. */
async function replan(ctx: AppContext): Promise<void> {
  try {
    await regenerateWeek(ctx, weekStartOf(ctx.today));
  } catch {
    // Le programme se réajustera à la prochaine génération.
  }
}

export async function createPiece(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pieceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const ctx = await getContext();
  const p = parsed.data;
  const created = await ctx.supabase
    .from("user_repertoire")
    .insert({
      user_id: ctx.user.id,
      title: p.title,
      composer: p.composer,
      style: p.style,
      tier: p.tier,
      status: p.status,
      level: p.level ?? null,
      felt_difficulty: p.feltDifficulty ?? null,
      current_step: p.currentStep,
      notes: p.notes,
      source_url: p.sourceUrl ?? null,
    })
    .select("id")
    .single();
  if (created.error) return fail("Le morceau n'a pas pu être ajouté. Réessaie.");
  if (p.status === "active") await replan(ctx);
  revalidatePath("/", "layout");
  redirect(`/repertoire/${created.data.id}`);
}

export async function addFromCatalog(formData: FormData): Promise<void> {
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const ctx = await getContext();
  const item = await ctx.supabase
    .from("repertoire_catalog")
    .select("id, title, composer, style, level, tier, source_url")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!item.data) return;
  const created = await ctx.supabase
    .from("user_repertoire")
    .insert({
      user_id: ctx.user.id,
      catalog_id: item.data.id,
      title: item.data.title,
      composer: item.data.composer,
      style: item.data.style,
      level: item.data.level,
      tier: item.data.tier,
      status: "active",
      source_url: item.data.source_url,
    })
    .select("id")
    .single();
  if (created.error) return;
  await replan(ctx);
  revalidatePath("/", "layout");
  redirect(`/repertoire/${created.data.id}`);
}

export async function updatePiece(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pieceUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const ctx = await getContext();
  const p = parsed.data;
  const updated = await ctx.supabase
    .from("user_repertoire")
    .update({
      title: p.title,
      composer: p.composer,
      style: p.style,
      tier: p.tier,
      status: p.status,
      level: p.level ?? null,
      felt_difficulty: p.feltDifficulty ?? null,
      current_step: p.currentStep,
      notes: p.notes,
      source_url: p.sourceUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", p.id)
    .select("id")
    .maybeSingle();
  if (updated.error || !updated.data) return fail("Le morceau n'a pas pu être enregistré. Réessaie.");
  await replan(ctx);
  revalidatePath("/", "layout");
  return done("Morceau enregistré.");
}

export async function deletePiece(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || formData.get("confirm") !== "on") {
    return fail("Coche la case pour confirmer la suppression.");
  }
  const ctx = await getContext();
  const piece = await ctx.supabase.from("user_repertoire").select("id, pdf_asset_id").eq("id", parsed.data.id).maybeSingle();
  if (!piece.data) return fail("Ce morceau n'existe plus.");
  if (piece.data.pdf_asset_id && !(await removeScore(ctx.supabase, piece.data.pdf_asset_id))) {
    return fail("La partition n'a pas pu être supprimée. Réessaie.");
  }
  const deleted = await ctx.supabase.from("user_repertoire").delete().eq("id", piece.data.id);
  if (deleted.error) return fail();
  await replan(ctx);
  revalidatePath("/", "layout");
  redirect("/repertoire");
}

/**
 * Appelée après l'envoi direct du fichier vers Storage (le navigateur n'envoie que le PDF,
 * dans son propre dossier, sous contrôle des policies). Le serveur revérifie tout.
 */
export async function registerPdf(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pdfRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const ctx = await getContext();
  const { supabase, user } = ctx;
  const { pieceId, assetId, filename } = parsed.data;
  const path = scorePath(user.id, assetId);

  const piece = await supabase.from("user_repertoire").select("id, pdf_asset_id").eq("id", pieceId).maybeSingle();
  const listed = await supabase.storage.from(SCORES_BUCKET).list(user.id, { search: `${assetId}.pdf`, limit: 1 });
  const object = listed.data?.find((o) => o.name === `${assetId}.pdf`);
  const size = Number(object?.metadata?.size ?? 0);
  const mime = String(object?.metadata?.mimetype ?? "");

  if (!piece.data || !object || mime !== "application/pdf" || size <= 0 || size > PDF_MAX_BYTES) {
    if (object) await supabase.storage.from(SCORES_BUCKET).remove([path]);
    return fail(
      !piece.data ? "Ce morceau n'existe plus." : "Fichier refusé : il faut un PDF de 20 Mo maximum.",
    );
  }

  const inserted = await supabase.from("pdf_assets").insert({
    id: assetId,
    user_id: user.id,
    storage_path: path,
    original_filename: filename,
    mime_type: "application/pdf",
    size_bytes: size,
  });
  if (inserted.error) {
    await supabase.storage.from(SCORES_BUCKET).remove([path]);
    return fail("La partition n'a pas pu être enregistrée. Réessaie.");
  }
  const previous = piece.data.pdf_asset_id;
  const linked = await supabase.from("user_repertoire").update({ pdf_asset_id: assetId }).eq("id", pieceId);
  if (linked.error) {
    await removeScore(supabase, assetId);
    return fail("La partition n'a pas pu être associée au morceau. Réessaie.");
  }
  if (previous) await removeScore(supabase, previous);
  revalidatePath("/", "layout");
  return done("Partition enregistrée.");
}

export async function deletePdf(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail();
  const { supabase } = await getContext();
  const piece = await supabase.from("user_repertoire").select("pdf_asset_id").eq("id", parsed.data.id).maybeSingle();
  if (!piece.data?.pdf_asset_id) return done("Aucune partition à supprimer.");
  if (!(await removeScore(supabase, piece.data.pdf_asset_id))) {
    return fail("La partition n'a pas pu être supprimée. Réessaie.");
  }
  revalidatePath("/", "layout");
  return done("Partition supprimée.");
}
