# Roadmap — Piano Coach

Livraison par tranches verticales. Les fonctionnalités sont décrites dans [PRODUCT.md](PRODUCT.md) ; ce fichier ne dit que **l'ordre** et **quand c'est fini**.

## Étape 1 — POC

**Question à prouver** : je me connecte, j'ouvre une séance, je saisis un résultat et un BPM, et je retrouve la donnée sur l'autre appareil — avec Vercel + Supabase, sans serveur à gérer.

**Contenu**
1. Next.js + TypeScript + Tailwind + shadcn/ui initialisés, CI GitHub Actions.
2. Supabase : auth email/mot de passe, inscription désactivée, compte unique créé à la main.
3. Shell responsive avec l'accueil et la navigation de la maquette.
4. Seed minimal : 4 exercices (un par domaine hors répertoire) + 1 morceau du domaine public.
5. Une séance de démonstration fixe (pas encore de planner).
6. Démarrer la séance, saisir `réussi`/`à retravailler` + BPM, terminer.
7. Historique des logs.
8. Déploiement Vercel.

**Fini quand**
- [ ] Connexion et déconnexion fonctionnent ; une page privée sans session redirige vers `/connexion`.
- [ ] Le résultat et le BPM sont validés côté serveur et persistent après rechargement.
- [ ] Le résultat apparaît sur un second appareil connecté au même compte.
- [ ] Un test prouve qu'un autre utilisateur ne lit pas ces données (RLS).
- [ ] Aucun secret dans le bundle client.
- [ ] Parcours utilisable à 390 px, sur iPad et sur desktop.
- [ ] Démontré en conditions réelles (la maquette seule ne compte pas).

## Étape 2 — MVP

Ordre d'implémentation :

1. **Modèle de données complet + seed** (compétences, exercices, répertoire suggéré).
2. **Exercices** : catalogue filtrable, fiches.
3. **Répertoire + PDF privés**.
4. **Profil et paramètres** : auto-évaluation, disponibilités, préférences.
5. **Planner** et programme de la semaine, édition manuelle.
6. **Parcours pédagogique**.
7. **Progression** et statistiques.
8. **Export** JSON/CSV + procédure de sauvegarde/restauration documentée.
9. **Durcissement** : E2E Playwright, revue sécurité.

**Fini quand**
- [ ] Toutes les données personnelles sont en PostgreSQL, protégées par RLS (tables et Storage).
- [ ] Le plan du jour respecte la durée configurée.
- [ ] Le plan de la semaine couvre les 5 domaines.
- [ ] Une tâche `à retravailler` revient plus tard, sans dette ; une tâche manquée n'est pas reportée.
- [ ] La cible BPM n'augmente qu'après 3 réussites consécutives, et la raison est affichée.
- [ ] Les modifications manuelles du programme survivent à une régénération (ou sont remplacées après confirmation).
- [ ] Les PDF s'importent, se consultent et se suppriment de façon privée.
- [ ] Les statistiques ne reflètent que les logs réels.
- [ ] Les données essentielles s'exportent.
- [ ] Fonctionne sur Safari iPad et un navigateur Mac récent.
- [ ] Lint, typecheck, tests et build passent en CI.

## Tests attendus

| Type | Outil | Couvre |
|---|---|---|
| Unitaires | Vitest | Toutes les règles du planner (§6 de PRODUCT.md), progression BPM, statuts de compétences |
| RLS | SQL / Supabase local | Utilisateur propriétaire, anonyme, autre utilisateur — tables et Storage |
| PDF | Vitest + manuel | Type MIME, taille, chemin, accès non autorisé, URL signée expirée |
| E2E | Playwright (à partir du MVP) | Connexion → séance → résultat + BPM → historique |
| Visuel | Manuel | 390 px, iPad portrait/paysage, desktop |
