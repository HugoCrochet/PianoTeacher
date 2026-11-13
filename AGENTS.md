# AGENTS.md — Piano Coach

Application web privée, en français, pour organiser la pratique du piano d'**un seul utilisateur** (iPad + Mac). Coût d'infrastructure visé : 0 €.

## Où trouver quoi

Chaque sujet a **une seule** source de vérité. Ne pas recopier une règle d'un fichier à l'autre : faire un lien.

| Sujet | Fichier |
|---|---|
| Quoi construire, pour qui, règles du planner | [docs/PRODUCT.md](docs/PRODUCT.md) |
| Ordre de livraison et critères d'acceptation | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Stack, code, données, sécurité, déploiement | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Apparence et navigation | [piano-coach-maquette.html](piano-coach-maquette.html) — voir « Interface » ci-dessous |
| Décisions qui modifient ce qui précède | `docs/adr/NNNN-titre.md` (créer au besoin) |

En cas de conflit : demande explicite de l'utilisateur → ce fichier → le doc thématique ci-dessus. Si deux docs se contredisent, corriger le doc fautif dans la même tâche.

## Interface : suivre la maquette

[piano-coach-maquette.html](piano-coach-maquette.html) est **la** référence visuelle. L'ouvrir et la lire avant tout travail d'interface.

- **Reproduire fidèlement** : couleurs (tokens CSS `--bg`, `--ink`, `--mint`, `--lilac`…), mode sombre, police Bricolage Grotesque, tailles de texte, rayons, espacements, accueil à tuiles, en-têtes de page avec pastille, listes à séparateurs, bouton noir en pilule, bouton « Accueil ». Ne pas « améliorer » le design ni le remplacer par le style par défaut de shadcn.
- Reprendre les tokens de la maquette tels quels dans le thème Tailwind/shadcn. Les composants shadcn sont restylés pour ressembler à la maquette, pas l'inverse.
- **Écrans absents de la maquette** (séance, programme, fiche exercice, paramètres, connexion) : les composer avec les mêmes éléments et le même style, sans en inventer de nouveaux.
- Le contenu de la maquette est un exemple ; le comportement attendu est dans [PRODUCT.md](docs/PRODUCT.md).
- Responsive : même structure partout ; sous 760 px les tuiles passent sur une colonne. Vérifier à 390 px, iPad portrait/paysage et desktop.

## Règles non négociables

**Produit**
- Interface en français (`fr-FR`) uniquement. Ton encourageant, jamais culpabilisant.
- Un seul utilisateur, pas d'inscription publique, pas de social, pas de multi-tenant.
- Saisie **manuelle** : résultat `réussi` / `à retravailler` + BPM optionnel. Pas de micro, MIDI, détection de notes ni notation automatique.
- Planner déterministe, explicable, modifiable par l'utilisateur. Aucune dépendance IA.
- Aucun service payant ni clé d'API requis pour l'usage de base.
- Pas de partitions protégées (Alfred, éditions Hanon/Czerny…) dans le dépôt ni dans le seed : uniquement liens, domaine public et PDF de l'utilisateur.

**Code**
- Stack fixée dans [ARCHITECTURE.md](docs/ARCHITECTURE.md#1-stack). Ajouter une dépendance seulement quand un écran en a besoin. Pas de Prisma ni second backend sans ADR.
- Logique métier (planner, BPM, statuts) en fonctions pures sous `src/features/*/domain`, testées avec Vitest. Jamais dans un composant React ni une requête.
- Server Components par défaut ; Client Components seulement pour l'interactivité.
- Accès aux données côté serveur uniquement. Chaque mutation : validation Zod + utilisateur vérifié côté serveur. Ne jamais faire confiance à un `user_id` venant du navigateur.
- RLS sur chaque table et chaque objet Storage. Bucket PDF privé, URL signées courtes.
- Seules `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sont publiques. Aucun secret dans Git ; tenir `.env.example` à jour.
- TypeScript strict, pas de `any`. Dates stockées en ISO, affichées en `fr-FR`, fuseau local de l'utilisateur.
- Gérer les états chargement / vide / erreur / succès avec des messages en français.
- Accessibilité : HTML sémantique, focus visible, contraste AA, cibles tactiles ≥ 44 px, navigation clavier, statut jamais transmis par la seule couleur, respect de `prefers-reduced-motion`.

**Base de données et MCP Supabase**
- Toute modification de schéma passe par un fichier versionné dans `supabase/migrations/`.
- Le MCP Supabase (`.mcp.json`) pointe vers un projet distant : lecture libre, mais **demander avant** d'appliquer une migration, d'exécuter du SQL qui écrit, ou de créer/supprimer une branche.

## Workflow pour chaque tâche

1. Lire les docs concernés et le code existant.
2. Annoncer un plan court et les hypothèses.
3. Livrer la plus petite tranche verticale qui répond à la demande.
4. Tester les règles métier et les interactions critiques.
5. Lancer `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` — ou dire exactement ce qui n'a pas pu tourner.
6. Vérifier l'affichage à 390 px, iPad et desktop.
7. Vérifier : secrets, RLS, accès aux fichiers, dépendances payantes.
8. Mettre à jour les docs et `.env.example` si le comportement ou la configuration change.
9. Résumer : fichiers modifiés, vérifications faites, risques restants, configuration manuelle requise.

Ne jamais annoncer qu'un test, une migration ou un déploiement a réussi sans l'avoir exécuté et vérifié.
