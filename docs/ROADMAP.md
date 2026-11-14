# Roadmap — Piano Coach

Livraison par tranches verticales. Les fonctionnalités sont décrites dans [PRODUCT.md](PRODUCT.md) ; ce fichier ne dit que **l'ordre**, **ce qui est livré** et **quand c'est fini**.

Production : https://piano-coach-olive.vercel.app (Vercel `dub1` + Supabase eu-west-1).

## Livré

| Étape | Contenu | Livré le |
|---|---|---|
| 1 — POC | Auth email/mot de passe (inscription fermée), séance, résultat + BPM, historique, CI, déploiement | 13 nov. 2026 |
| 2 — MVP | Modèle complet + seed, exercices, répertoire + PDF privés, paramètres, planner + programme éditable, parcours, progression, export JSON/CSV, E2E et revue sécurité | 13 nov. 2026 |
| 3A — Au piano (partiel) | Métronome, minuteur par tâche, écran allumé (Wake Lock), mode pupitre | 14 nov. 2026 |
| 3B — Pédagogie visible | Cercle des 24 tonalités + tonalité du jour, passages de morceaux + passage le plus fragile, variante d'improvisation du jour, fiches de compétence | 14 nov. 2026 |
| 3C — Voir ses progrès | Bilan de la semaine, calendrier 12 semaines, temps par domaine sur 4 semaines, records et jalons | 14 nov. 2026 |

Tous les critères automatisables de ces étapes sont couverts par les tests (unitaires, RLS, navigateur) et la CI passe sur `main`.

## Vérifications manuelles restantes

À faire par l'utilisateur, en conditions réelles :

- [ ] Un résultat saisi sur l'iPad apparaît sur le Mac (même compte).
- [ ] Parcours complet sur Safari iPad (portrait et paysage) et sur un navigateur Mac récent.
- [ ] Au piano : métronome audible (y compris iPad en mode silencieux), écran qui reste allumé, mode pupitre lisible à 1 m.

## À faire

### Fin de la phase A — Au piano
1. **Installable sur l'écran d'accueil** (PWA : manifeste, icône, plein écran ; pas de mode hors ligne).
2. **Partition depuis la séance** : bouton « Ouvrir la partition » sur une tâche de répertoire qui a un PDF.
3. **Réactivité** : retour immédiat au clic sur les résultats, requêtes regroupées sur les pages les plus lentes.

**Fini quand**
- [ ] L'app s'ajoute à l'écran d'accueil de l'iPad et s'ouvre en plein écran, avec son icône.
- [ ] Une tâche de répertoire avec partition l'ouvre en un geste, sans quitter la séance.
- [ ] Valider un résultat donne un retour visuel immédiat ; aucune page privée ne dépasse ~1 s en production (mesuré).

### Phase D — Fiabilité à coût nul
1. Sauvegarde hebdomadaire automatique (GitHub Actions : dump SQL + PDF vers un dépôt privé).
2. Restauration testée et documentée.

**Fini quand**
- [ ] Une sauvegarde datée est produite chaque semaine sans action manuelle, sans secret dans le dépôt.
- [ ] Une restauration complète sur un Supabase local a été faite et la procédure est écrite.

### À trancher par ADR (contraire au hors-périmètre de PRODUCT §8)
- Flashcards de lecture en clé de fa (exige un rendu de notes sur portée).
- Mode hors ligne pour une séance sans réseau.

## Tests attendus

| Type | Outil | Couvre |
|---|---|---|
| Unitaires | Vitest | Règles du planner (PRODUCT §6), BPM, statuts de compétences et de passages, tonalités, variante d'improvisation, bilan, jalons, outils de séance |
| RLS | pgTAP / Supabase local | Propriétaire, autre utilisateur, anonyme — tables (dont passages) et Storage |
| PDF | Vitest + manuel | Type MIME, taille, chemin, accès non autorisé, URL signée expirée |
| E2E | Playwright, Supabase local | Connexion → séance (minuteur, métronome, pupitre) → résultat + BPM → progression ; répertoire, PDF, passages ; programme ; parcours et fiches ; responsive |
| Visuel | Manuel + captures Playwright | 390 px, iPad portrait/paysage, desktop |
