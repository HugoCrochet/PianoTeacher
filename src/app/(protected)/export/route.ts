import { NextResponse, type NextRequest } from "next/server";
import { DOMAIN_LABEL, RESULT_LABEL, type Domain, type PracticeResult } from "@/lib/domain/domains";
import { getSessionUser } from "@/lib/supabase/server";

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Export des données personnelles : `?format=json` (tout) ou `?format=csv` (historique de pratique). */
export async function GET(request: NextRequest) {
  const { supabase, user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "private, no-store" };

  if (request.nextUrl.searchParams.get("format") === "csv") {
    const { data, error } = await supabase
      .from("practice_logs")
      .select("practice_date, domain, actual_minutes, bpm, result, exercise:exercises ( title ), piece:user_repertoire ( title )")
      .order("practiced_at", { ascending: true });
    if (error) return NextResponse.json({ error: "Export impossible." }, { status: 500 });
    const lines = [
      ["date", "domaine", "intitule", "minutes", "bpm", "resultat"].join(";"),
      ...data.map((l) =>
        [
          l.practice_date,
          DOMAIN_LABEL[l.domain as Domain],
          l.exercise?.title ?? l.piece?.title ?? "",
          l.actual_minutes,
          l.bpm,
          RESULT_LABEL[l.result as PracticeResult],
        ]
          .map(csvCell)
          .join(";"),
      ),
    ];
    return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="piano-coach-pratique-${stamp}.csv"`,
      },
    });
  }

  const [profile, competencies, repertoire, pdfs, plans, tasks, sessions, logs] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("user_competencies").select("*, competency:competencies ( slug, name )"),
    supabase.from("user_repertoire").select("*"),
    supabase.from("pdf_assets").select("*"),
    supabase.from("practice_plans").select("*"),
    supabase.from("planned_tasks").select("*, exercise:exercises ( slug, title )"),
    supabase.from("practice_sessions").select("*"),
    supabase.from("practice_logs").select("*, exercise:exercises ( slug, title )"),
  ]);
  if ([profile, competencies, repertoire, pdfs, plans, tasks, sessions, logs].some((r) => r.error)) {
    return NextResponse.json({ error: "Export impossible." }, { status: 500 });
  }
  const body = {
    exported_at: new Date().toISOString(),
    note: "Les fichiers PDF ne sont pas inclus : seules leurs métadonnées figurent dans pdf_assets.",
    profile: profile.data?.[0] ?? null,
    user_competencies: competencies.data,
    user_repertoire: repertoire.data,
    pdf_assets: pdfs.data,
    practice_plans: plans.data,
    planned_tasks: tasks.data,
    practice_sessions: sessions.data,
    practice_logs: logs.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="piano-coach-export-${stamp}.json"`,
    },
  });
}
