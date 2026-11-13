import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : le proxy rafraîchit déjà la session.
        }
      },
    },
  });
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Utilisateur vérifié auprès de Supabase Auth (jamais un user_id venu du navigateur).
 * Dédupliqué par requête.
 */
export const getSessionUser = cache(async (): Promise<{ supabase: ServerClient; user: User | null }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export async function requireUser(): Promise<{ supabase: ServerClient; user: User }> {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/connexion");
  return { supabase, user };
}
