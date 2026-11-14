import type { Metadata } from "next";
import { Shuffle } from "lucide-react";
import { BackLink, PageHead, Screen } from "@/components/layout/page";
import { loadKeyStatuses } from "@/features/curriculum/server/keys";
import { ImprovDraw } from "@/features/practice/improv-draw";
import { getContext } from "@/features/profile/server/profile";

export const metadata: Metadata = { title: "Tirage d’improvisation" };

export default async function ImprovisationDrawPage() {
  const { supabase } = await getContext();
  const statuses = await loadKeyStatuses(supabase);
  return (
    <Screen>
      <BackLink href="/exercices" label="Exercices" />
      <PageHead
        icon={Shuffle}
        tint="peach"
        title="Tirage d’improvisation"
        subtitle="Une tonalité et 3 ou 4 accords au hasard. Boucle la progression et invente par-dessus."
      />
      <ImprovDraw statuses={statuses} />
    </Screen>
  );
}
