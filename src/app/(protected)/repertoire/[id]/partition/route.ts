import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { signedScoreUrl } from "@/features/repertoire/server/pdf";
import { getSessionUser } from "@/lib/supabase/server";

/** Ouvre la partition (nouvel onglet, impression) via une URL signée de courte durée, générée à la demande. */
export async function GET(request: NextRequest, ctx: RouteContext<"/repertoire/[id]/partition">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/connexion", request.url));
  if (!z.uuid().safeParse(id).success) return new NextResponse("Partition introuvable.", { status: 404 });

  const score = await signedScoreUrl(supabase, id);
  if (!score) return new NextResponse("Partition introuvable.", { status: 404 });
  if (score === "error") return new NextResponse("La partition est indisponible pour le moment.", { status: 502 });
  return NextResponse.redirect(score.url, { headers: { "Cache-Control": "private, no-store" } });
}
