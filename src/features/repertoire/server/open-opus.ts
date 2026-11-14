import "server-only";
import { z } from "zod";
import {
  lifespan,
  periodFromEpoch,
  sortWorks,
  translateQuery,
  translateTitle,
  type FoundComposer,
  type FoundWork,
} from "../domain/catalog-search";

/**
 * Client Open Opus (https://openopus.org) : API publique, gratuite, sans clé.
 * Appelée uniquement côté serveur ; seuls les mots recherchés sont transmis.
 * Réponses mises en cache 24 h, abandon après 5 s (docs/adr/0002-recherche-oeuvres-open-opus.md).
 */
const BASE_URL = process.env.OPEN_OPUS_BASE_URL ?? "https://api.openopus.org";
const TIMEOUT_MS = 5000;
const ONE_DAY = 86_400;

const composerSchema = z.object({
  id: z.coerce.string(),
  name: z.string(),
  complete_name: z.string().optional(),
  epoch: z.string().nullish(),
  birth: z.string().nullish(),
  death: z.string().nullish(),
});
const workSchema = z.object({
  id: z.coerce.string(),
  title: z.string(),
  genre: z.string().nullish(),
  popular: z.union([z.string(), z.number(), z.boolean()]).nullish(),
});
const omnisearchSchema = z.object({
  results: z.array(z.object({ composer: composerSchema, work: workSchema.nullish() })).default([]),
});
const composerWorksSchema = z.object({
  composer: composerSchema.optional(),
  works: z.array(workSchema).default([]),
});

export type SearchOutcome =
  | { status: "ok"; works: FoundWork[]; composers: FoundComposer[] }
  | { status: "unavailable" };

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: ONE_DAY },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Open Opus : HTTP ${response.status}`);
  return response.json();
}

function toComposer(c: z.infer<typeof composerSchema>): FoundComposer {
  return { id: c.id, name: c.complete_name ?? c.name, period: periodFromEpoch(c.epoch), lifespan: lifespan(c.birth, c.death) };
}

function toWork(w: z.infer<typeof workSchema>, composer: FoundComposer): FoundWork {
  return {
    id: w.id,
    originalTitle: w.title.trim(),
    title: translateTitle(w.title),
    composer: composer.name,
    composerId: composer.id,
    period: composer.period,
    lifespan: composer.lifespan,
    popular: w.popular === true || w.popular === 1 || w.popular === "1",
  };
}

/** Œuvres pour clavier correspondant à une recherche libre (compositeur et/ou titre, en français ou en anglais). */
export async function searchWorks(query: string): Promise<SearchOutcome> {
  const terms = translateQuery(query);
  if (terms.length < 2) return { status: "ok", works: [], composers: [] };
  try {
    const pages = await Promise.all(
      [0, 20].map(async (offset) => omnisearchSchema.parse(await getJson(`/omnisearch/${encodeURIComponent(terms)}/${offset}.json`))),
    );
    const works: FoundWork[] = [];
    const composers = new Map<string, FoundComposer>();
    for (const { results } of pages) {
      for (const r of results) {
        const composer = toComposer(r.composer);
        if (!r.work) composers.set(composer.id, composer);
        else if (r.work.genre === "Keyboard") works.push(toWork(r.work, composer));
      }
    }
    return { status: "ok", works: sortWorks(works).slice(0, 30), composers: [...composers.values()].slice(0, 5) };
  } catch {
    return { status: "unavailable" };
  }
}

/** Toutes les œuvres pour clavier d'un compositeur Open Opus. */
export async function composerKeyboardWorks(composerId: string): Promise<SearchOutcome & { composer?: FoundComposer }> {
  if (!/^\d{1,6}$/.test(composerId)) return { status: "ok", works: [], composers: [] };
  try {
    const data = composerWorksSchema.parse(await getJson(`/work/list/composer/${composerId}/genre/Keyboard.json`));
    if (!data.composer) return { status: "ok", works: [], composers: [] };
    const composer = toComposer(data.composer);
    return { status: "ok", composer, works: sortWorks(data.works.map((w) => toWork(w, composer))), composers: [] };
  } catch {
    return { status: "unavailable" };
  }
}
