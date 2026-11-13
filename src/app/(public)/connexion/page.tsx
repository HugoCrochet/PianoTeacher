import type { Metadata } from "next";
import { Piano } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { PageHead, Screen } from "@/components/layout/page";
import { Input, Label } from "@/components/ui/field";
import { signIn } from "@/features/auth/server/actions";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionPage() {
  return (
    <Screen className="justify-center">
      <div className="w-full max-w-[440px]">
        <PageHead icon={Piano} tint="mint" title="Piano Coach" subtitle="Connecte-toi pour retrouver ta séance." />
        <ActionForm action={signIn} className="space-y-5">
          <div>
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <SubmitButton pendingLabel="Connexion…">Se connecter</SubmitButton>
        </ActionForm>
      </div>
    </Screen>
  );
}
