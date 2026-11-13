"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";
import { firstError, loginSchema } from "@/lib/validation/schemas";

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return fail(
      error.status === 400
        ? "E-mail ou mot de passe incorrect."
        : "Connexion impossible pour le moment. Réessaie dans un instant.",
    );
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/connexion");
}
