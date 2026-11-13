import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { SCORES_BUCKET } from "@/features/repertoire/server/pdf";
import { getSessionUser } from "@/lib/supabase/server";

/** Ouvre la partition via une URL signée de courte durée, générée à la demande. */
export async function GET(request: NextRequest, ctx: RouteContext<"/repertoire/[id]/partition">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/connexion", request.url));
  if (!z.uuid().safeParse(id).success) return new NextResponse("Partition introuvable.", { status: 404 });

  const piece = await supabase
    .from("user_repertoire")
    .select("pdf:pdf_assets ( storage_path )")
    .eq("id", id)
    .maybeSingle();
  const path = piece.data?.pdf?.storage_path;
  if (!path) return new NextResponse("Partition introuvable.", { status: 404 });

  const signed = await supabase.storage.from(SCORES_BUCKET).createSignedUrl(path, 300);
  if (signed.error || !signed.data) {
    return new NextResponse("La partition est indisponible pour le moment.", { status: 502 });
  }
  return NextResponse.redirect(signed.data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
