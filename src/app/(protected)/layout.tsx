import { requireUser } from "@/lib/supabase/server";

/** Toutes les pages de ce groupe exigent une session vérifiée côté serveur. */
export default async function ProtectedLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return children;
}
