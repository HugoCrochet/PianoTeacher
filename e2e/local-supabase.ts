import { execFileSync } from "node:child_process";

export const E2E_USER = { email: "e2e@piano-coach.local", password: "motdepasse-local-e2e" };

interface LocalStatus {
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SERVICE_ROLE_KEY: string;
}

/** Clés du Supabase local, lues à la volée (jamais écrites dans le dépôt). */
export function localStatus(): LocalStatus {
  const raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], { encoding: "utf8" });
  const status = JSON.parse(raw.slice(raw.indexOf("{"))) as LocalStatus;
  if (!status.API_URL.includes("127.0.0.1")) throw new Error("Les tests E2E exigent un Supabase local.");
  return status;
}
