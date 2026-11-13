/** Réponse typée des server actions, affichée par <ActionForm>. */
export type ActionState = { ok: boolean; message: string } | null;

export const GENERIC_ERROR = "Une erreur est survenue. Réessaie dans un instant.";

export function fail(message: string = GENERIC_ERROR): ActionState {
  return { ok: false, message };
}

export function done(message: string): ActionState {
  return { ok: true, message };
}
