/** Les 5 domaines — seule taxonomie de l'application (docs/PRODUCT.md §4). */
export const EXERCISE_DOMAINS = ["technique", "scales_harmony", "reading_rhythm", "improvisation"] as const;
export const DOMAINS = [...EXERCISE_DOMAINS, "repertoire"] as const;

export type ExerciseDomain = (typeof EXERCISE_DOMAINS)[number];
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABEL: Record<Domain, string> = {
  technique: "Technique",
  scales_harmony: "Gammes et harmonie",
  reading_rhythm: "Lecture et rythme",
  improvisation: "Improvisation",
  repertoire: "Répertoire",
};

export function isDomain(value: string): value is Domain {
  return (DOMAINS as readonly string[]).includes(value);
}

export function isExerciseDomain(value: string): value is ExerciseDomain {
  return (EXERCISE_DOMAINS as readonly string[]).includes(value);
}

export type PracticeResult = "success" | "retry";
export const RESULT_LABEL: Record<PracticeResult, string> = {
  success: "Réussi",
  retry: "À retravailler",
};

export type CompetencyStatus = "upcoming" | "learning" | "consolidating" | "acquired";
export const COMPETENCY_STATUS_LABEL: Record<CompetencyStatus, string> = {
  upcoming: "À venir",
  learning: "En cours",
  consolidating: "En consolidation",
  acquired: "Acquise",
};

export type Tier = "comfort" | "growth" | "challenge";
export const TIER_LABEL: Record<Tier, string> = {
  comfort: "Confort",
  growth: "Progression",
  challenge: "Challenge",
};

export type PieceStatus = "to_discover" | "active" | "paused" | "completed";
export const PIECE_STATUS_LABEL: Record<PieceStatus, string> = {
  to_discover: "À découvrir",
  active: "En cours",
  paused: "En pause",
  completed: "Terminé",
};

export type Style = "classical" | "film" | "other";
export const STYLE_LABEL: Record<Style, string> = {
  classical: "Classique",
  film: "Musique de film",
  other: "Autre",
};

export type SourceType = "original" | "public_domain" | "reference" | "user_upload";
export const SOURCE_LABEL: Record<SourceType, string> = {
  original: "Exercice original",
  public_domain: "Domaine public",
  reference: "Référence externe",
  user_upload: "Fichier personnel",
};
