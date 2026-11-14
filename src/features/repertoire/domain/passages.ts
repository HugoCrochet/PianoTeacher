/**
 * Passages d'un morceau : statut d'après les résultats réels et choix du passage le plus fragile.
 * Fonctions pures, sans dépendance à Next.js ni Supabase.
 */

export type PassageStatus = "new" | "learning" | "solid";

export const PASSAGE_STATUS_LABEL: Record<PassageStatus, string> = {
  new: "Pas encore travaillé",
  learning: "En travail",
  solid: "Solide",
};

export interface Passage {
  id: string;
  position: number;
  label: string;
  targetBpm: number | null;
}

export interface PassageLog {
  passageId: string | null;
  date: string;
  result: "success" | "retry";
  bpm: number | null;
}

/** Solide = au moins 3 réussites et les 2 derniers résultats réussis (jamais sur une seule réussite). */
export function passageStatus(logs: readonly PassageLog[]): PassageStatus {
  if (logs.length === 0) return "new";
  const successes = logs.filter((l) => l.result === "success").length;
  const lastTwoOk = logs.length >= 2 && logs.slice(-2).every((l) => l.result === "success");
  return successes >= 3 && lastTwoOk ? "solid" : "learning";
}

/** Dernier BPM saisi sur le passage (logs en ordre chronologique). */
export function lastBpm(logs: readonly PassageLog[]): number | null {
  for (let i = logs.length - 1; i >= 0; i -= 1) if (logs[i].bpm !== null) return logs[i].bpm;
  return null;
}

export interface PassageChoice {
  passage: Passage;
  reason: string;
}

/**
 * Passage à travailler : d'abord celui raté la dernière fois (le plus de ratés d'affilée en tête),
 * puis ceux en travail (le moins de réussites), puis le suivant jamais travaillé (dans l'ordre
 * du morceau), enfin les passages solides en entretien. À égalité : le moins proposé cette
 * semaine, le moins réussi, le plus ancien, puis l'ordre du morceau.
 */
export function choosePassage(
  passages: readonly Passage[],
  logs: readonly PassageLog[],
  assigned: ReadonlyMap<string, number> = new Map(),
): PassageChoice | null {
  if (passages.length === 0) return null;
  const ranked = passages.map((passage) => {
    const own = logs.filter((l) => l.passageId === passage.id);
    const status = passageStatus(own);
    const last = own[own.length - 1];
    let retries = 0;
    for (let i = own.length - 1; i >= 0 && own[i].result === "retry"; i -= 1) retries += 1;
    const successes = own.filter((l) => l.result === "success").length;
    const group = retries > 0 ? 0 : status === "learning" ? 1 : status === "new" ? 2 : 3;
    return { passage, status, retries, successes, group, lastDate: last?.date ?? "", week: assigned.get(passage.id) ?? 0 };
  });
  ranked.sort(
    (a, b) =>
      a.group - b.group ||
      b.retries - a.retries ||
      // Les passages jamais travaillés se prennent dans l'ordre du morceau ; les autres tournent dans la semaine.
      (a.group === 2 ? 0 : a.week - b.week) ||
      a.successes - b.successes ||
      a.lastDate.localeCompare(b.lastDate) ||
      a.passage.position - b.passage.position,
  );
  const top = ranked[0];
  const why =
    top.group === 0
      ? "à retravailler la dernière fois"
      : top.group === 1
        ? `en travail, ${top.successes} ${top.successes > 1 ? "réussites" : "réussite"}`
        : top.group === 2
          ? "pas encore travaillé"
          : "solide, entretien";
  return { passage: top.passage, reason: `passage le plus fragile : « ${top.passage.label} », ${why}` };
}

/** « Mesures 1–8 », « Mesures 9–16 »… pour découper un morceau en passages égaux. */
export function splitMeasures(totalMeasures: number, size: number): string[] {
  const labels: string[] = [];
  for (let start = 1; start <= totalMeasures; start += size) {
    const end = Math.min(totalMeasures, start + size - 1);
    labels.push(start === end ? `Mesure ${start}` : `Mesures ${start}–${end}`);
  }
  return labels;
}
