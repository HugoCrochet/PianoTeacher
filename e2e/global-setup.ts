import { E2E_USER, localStatus } from "./local-supabase";

/** Repart d'un compte de test vierge : supprime puis recrée l'utilisateur local. */
export default async function globalSetup() {
  const { API_URL, SERVICE_ROLE_KEY } = localStatus();
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  const list = await fetch(`${API_URL}/auth/v1/admin/users?per_page=200`, { headers });
  if (!list.ok) throw new Error(`Supabase local injoignable (${list.status}). Lance « pnpm db:start ».`);
  const { users } = (await list.json()) as { users: { id: string; email: string }[] };
  for (const user of users.filter((u) => u.email === E2E_USER.email)) {
    await fetch(`${API_URL}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers });
  }
  const created = await fetch(`${API_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...E2E_USER, email_confirm: true }),
  });
  if (!created.ok) throw new Error(`Création du compte de test impossible : ${await created.text()}`);
}
