import "server-only";
import { createServerClient } from "@supabase/ssr";
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

/** Identité extraite d'un jeton dont la signature a été vérifiée. */
export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Utilisateur authentifié (jamais un user_id venu du navigateur).
 * `getClaims` vérifie la signature du jeton avec la clé publique du projet (ES256),
 * sans appel au serveur d'authentification ; il ne retombe sur un appel réseau
 * que si le projet utilisait encore une clé symétrique. Dédupliqué par requête.
 */
export const getSessionUser = cache(async (): Promise<{ supabase: ServerClient; user: SessionUser | null }> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  const user = claims?.sub ? { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null } : null;
  return { supabase, user };
});

export async function requireUser(): Promise<{ supabase: ServerClient; user: SessionUser }> {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/connexion");
  return { supabase, user };
}
