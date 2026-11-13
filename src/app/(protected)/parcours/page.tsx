import type { Metadata } from "next";
import { Route } from "lucide-react";
import { BackLink, PageHead, Screen, SectionTitle } from "@/components/layout/page";
import {
  COMPETENCY_STATUS_LABEL,
  DOMAIN_LABEL,
  EXERCISE_DOMAINS,
  type CompetencyStatus,
} from "@/lib/domain/domains";
import { cn } from "@/lib/utils";
import { currentLevel } from "@/features/curriculum/domain/competency-status";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Parcours pédagogique" };

export default async function PathPage() {
  const { supabase } = await getContext();
  const [competencies, statuses] = await Promise.all([
    supabase.from("competencies").select("id, name, domain, level, position, description").order("level").order("position"),
    supabase.from("user_competencies").select("competency_id, status"),
  ]);
  if (competencies.error) throw new Error(competencies.error.message);
  const statusById = new Map((statuses.data ?? []).map((s) => [s.competency_id, s.status as CompetencyStatus]));
  const items = competencies.data.map((c) => ({ ...c, status: statusById.get(c.id) ?? ("upcoming" as const) }));

  return (
    <Screen>
      <BackLink />
      <PageHead
        icon={Route}
        tint="sky"
        title="Parcours pédagogique"
        subtitle="Tes compétences, étape par étape. Elles avancent avec tes résultats."
      />
      {EXERCISE_DOMAINS.map((domain) => {
        const inDomain = items.filter((c) => c.domain === domain);
        const progress = currentLevel(inDomain);
        if (!progress) return null;
        return (
          <section key={domain} aria-labelledby={`parcours-${domain}`}>
            <SectionTitle>
              <span id={`parcours-${domain}`}>{DOMAIN_LABEL[domain]}</span>{" "}
              <span className="text-[17px] font-normal text-ink-2">
                niveau {progress.level} · {progress.done} sur {progress.total} acquises
              </span>
            </SectionTitle>
            <ol className="max-w-[760px] list-none border-t-[1.5px] border-line">
              {inDomain.map((c) => (
                <li key={c.id} className="flex items-center gap-[18px] border-b-[1.5px] border-line px-1 py-[18px] text-lg">
                  <span
                    aria-hidden
                    className={cn(
                      "size-3 flex-none rounded-full border-[1.5px] border-ink",
                      c.status === "acquired" && "bg-ink",
                      c.status === "consolidating" && "bg-ink-2",
                    )}
                  />
                  <span className={cn("min-w-0 flex-1", c.status === "acquired" && "text-ink-2 line-through decoration-1")}>
                    {c.name}
                    <small className="mt-0.5 block text-[15px] text-ink-2">
                      Niveau {c.level} · {c.description}
                    </small>
                  </span>
                  <span className={cn("text-base whitespace-nowrap", c.status === "learning" ? "font-bold text-ink" : "text-ink-2")}>
                    {COMPETENCY_STATUS_LABEL[c.status]}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </Screen>
  );
}
