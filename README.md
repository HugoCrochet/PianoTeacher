# Piano Coach

Application web privée pour organiser ma pratique du piano : séance du jour, exercices, répertoire, partitions PDF et suivi des progrès. En français, pour iPad et Mac, hébergée gratuitement (Vercel + Supabase).

## Documentation

- [AGENTS.md](AGENTS.md) — règles pour les agents de code (à lire en premier)
- [docs/PRODUCT.md](docs/PRODUCT.md) — fonctionnalités et règles du planner
- [docs/ROADMAP.md](docs/ROADMAP.md) — étapes et critères d'acceptation
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, données, sécurité, déploiement
- [piano-coach-maquette.html](piano-coach-maquette.html) — maquette, référence visuelle

## Démarrage en local

Prérequis : Node.js LTS, pnpm, Docker (pour le Supabase local).

```bash
pnpm install
pnpm db:start                 # Supabase local ; affiche l'URL et la clé « publishable »
cp .env.example .env.local    # puis y coller ces deux valeurs
pnpm dev                      # http://localhost:3000
```

Créer le compte (l'inscription publique est désactivée) : tableau de bord Supabase → Authentication → Users → « Add user », avec e-mail et mot de passe, en cochant « Auto Confirm ».

## Vérifications

```bash
pnpm lint && pnpm typecheck && pnpm test   # qualité + tests unitaires
pnpm test:db                               # RLS (Supabase local)
pnpm test:e2e                              # parcours navigateur (Supabase local)
pnpm build
```

## Mise en production

1. **Supabase** : appliquer les fichiers de `supabase/migrations/` au projet, désactiver « Allow new users to sign up » (Authentication → Sign In / Providers), créer l'unique compte.
2. **Vercel** : importer le dépôt GitHub, définir `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. **Supabase → Authentication → URL Configuration** : mettre l'URL Vercel en « Site URL ».

## Sauvegarde et restauration

L'offre gratuite de Supabase n'inclut pas de sauvegarde, et met en pause un projet inactif (réactivation manuelle depuis le tableau de bord).

- **Données** : Paramètres → « Tout exporter (JSON) » et « Historique de pratique (CSV) ». Pour une copie complète : `pnpm exec supabase db dump --linked -f sauvegarde.sql`.
- **Partitions** : les PDF ne sont pas dans l'export ; garder les originaux, ou les télécharger depuis Storage → `personal-scores`.
- **Restauration** : nouveau projet Supabase → appliquer `supabase/migrations/` → recréer le compte → réimporter le dump de données (`psql -f sauvegarde.sql`) → renvoyer les PDF depuis chaque fiche de morceau.
