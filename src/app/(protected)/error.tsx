"use client";

import { BackLink, EmptyState, Screen } from "@/components/layout/page";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Screen>
      <BackLink />
      <EmptyState title="Quelque chose n'a pas fonctionné">
        <p>Tes données sont intactes. Vérifie ta connexion, puis réessaie.</p>
        <Button className="mt-5" size="md" onClick={reset}>
          Réessayer
        </Button>
      </EmptyState>
    </Screen>
  );
}
