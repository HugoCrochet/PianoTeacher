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
- [x] Connexion et déconnexion fonctionnent ; une page privée sans session redirige vers `/connexion`.
- [x] Le résultat et le BPM sont validés côté serveur et persistent après rechargement.
- [ ] Le résultat apparaît sur un second appareil connecté au même compte.
- [x] Un test prouve qu'un autre utilisateur ne lit pas ces données (RLS).
- [x] Aucun secret dans le bundle client.
- [x] Parcours utilisable à 390 px, sur iPad et sur desktop.
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
- [x] Toutes les données personnelles sont en PostgreSQL, protégées par RLS (tables et Storage).
- [x] Le plan du jour respecte la durée configurée.
- [x] Le plan de la semaine couvre les 5 domaines.
- [x] Une tâche `à retravailler` revient plus tard, sans dette ; une tâche manquée n'est pas reportée.
- [x] La cible BPM n'augmente qu'après 3 réussites consécutives, et la raison est affichée.
- [x] Les modifications manuelles du programme survivent à une régénération (ou sont remplacées après confirmation).
- [x] Les PDF s'importent, se consultent et se suppriment de façon privée.
- [x] Les statistiques ne reflètent que les logs réels.
- [x] Les données essentielles s'exportent.
- [ ] Fonctionne sur Safari iPad et un navigateur Mac récent.
- [ ] Lint, typecheck, tests et build passent en CI.

> État au 13 novembre 2026 : cases cochées = vérifié par les tests automatiques (unitaires, RLS, navigateur) sur Supabase local, et déploiement en ligne sur https://piano-coach-olive.vercel.app. Restent à faire par l'utilisateur : essai sur un vrai iPad et un second appareil ; la CI tournera au premier push sur GitHub.

## Étape 3 — Au-delà du MVP

Le comportement attendu de chaque fonctionnalité livrée est décrit dans [PRODUCT.md](PRODUCT.md). Ordre recommandé : phase A, puis B2 (passages), puis le reste.

### Phase A — Au piano
1. **Métronome** dans la séance, calé sur le BPM cible de la tâche, réglable −/+.
2. **Minuteur par tâche** : compte à rebours sur la durée prévue, signal doux à la fin, durée réelle pré-remplie.
3. **Écran toujours allumé** pendant la séance (Wake Lock).
4. **Installable sur l'écran d'accueil** (PWA : icône, plein écran ; pas de mode hors ligne).
5. **Mode pupitre** : texte et boutons agrandis, lisibles à 1 m.
6. **Partition depuis la séance** : bouton « Ouvrir la partition » sur une tâche de répertoire.
7. **Réactivité** : retour immédiat au clic, requêtes regroupées.

**Fini quand**
- [x] Le métronome démarre au BPM cible, se règle pendant qu'il joue et s'arrête quand on change de tâche.
- [x] Le minuteur se lance, se met en pause, signale la fin du temps prévu sans bloquer, et pré-remplit la durée réelle (toujours modifiable).
- [x] L'écran ne se met pas en veille pendant une séance (navigateurs compatibles) ; sans support, rien ne casse.
- [x] Le mode pupitre s'active d'un bouton, est mémorisé sur l'appareil et reste utilisable à 390 px.
- [ ] Testé sur le vrai iPad, piano à côté (son du métronome audible, écran allumé).
- [ ] A4, A6, A7 livrés.

### Phase B — Pédagogie visible
1. **Les 12 tonalités** : cercle des quintes des gammes/arpèges travaillés ; le planner favorise les tonalités jamais jouées.
2. **Pièces découpées en passages** (mesures 1–8, 9–16…) avec statut et BPM ; le planner cible le passage le plus fragile.
3. **Consignes d'improvisation variées**, tirées de façon déterministe selon la date.
4. **Fiches de compétence** : objectif concret, exercices liés, ce qui manque pour « Acquise ».

### Phase C — Voir ses progrès
1. Calendrier de pratique, temps par domaine sur 4 semaines, courbes BPM (`recharts`).
2. Bilan de la semaine, au ton encourageant.
3. Records et jalons (première pièce jouée en entier, tonalité couverte…).

### Phase D — Fiabilité à coût nul
1. Sauvegarde hebdomadaire automatique (GitHub Actions : dump SQL + PDF vers un dépôt privé).
2. Restauration testée et documentée.
3. Clôturer l'étape 1 : iPad réel + second appareil.

### À trancher par ADR (contraire au hors-périmètre de PRODUCT §8)
- Flashcards de lecture en clé de fa (exige un rendu de notes sur portée).
- Mode hors ligne pour une séance sans réseau.

## Tests attendus

| Type | Outil | Couvre |
|---|---|---|
| Unitaires | Vitest | Toutes les règles du planner (§6 de PRODUCT.md), progression BPM, statuts de compétences |
| RLS | SQL / Supabase local | Utilisateur propriétaire, anonyme, autre utilisateur — tables et Storage |
| PDF | Vitest + manuel | Type MIME, taille, chemin, accès non autorisé, URL signée expirée |
| E2E | Playwright (à partir du MVP) | Connexion → séance → résultat + BPM → historique |
| Visuel | Manuel | 390 px, iPad portrait/paysage, desktop |
