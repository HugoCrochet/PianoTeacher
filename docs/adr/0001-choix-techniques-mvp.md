# ADR 0001 — Choix techniques pris pendant le MVP

Date : 2026-11-13 · Statut : accepté

## 1. Pas de cache de composants

**Contexte.** Next.js 16.4 active `cacheComponents` par défaut à la création du projet. Toutes nos pages lisent la session et des données propres à l'utilisateur.

**Décision.** `cacheComponents: false`. Chaque page est rendue à la demande ; les mutations appellent `revalidatePath`.

**Conséquence.** Aucun risque de servir une donnée privée depuis un cache partagé. À réévaluer seulement si une page publique apparaît.

## 2. Envoi des PDF directement vers Storage

**Contexte.** Une partition peut peser 20 Mo ; une fonction Vercel n'accepte que quelques Mo par requête.

**Décision.** Le navigateur envoie le fichier dans le bucket privé `personal-scores`, sous `<user_id>/<uuid>.pdf`. Les policies Storage limitent l'écriture au dossier de l'utilisateur ; le bucket impose le type PDF et 20 Mo. Une server action vérifie ensuite l'objet (existence, type, taille) et enregistre `pdf_assets` ; sinon elle supprime le fichier.

**Conséquence.** C'est le seul usage du client Supabase côté navigateur. Aucune clé privilégiée n'est exposée.

## 3. Cible BPM et statut des compétences déduits des logs

**Décision.** Ni la cible BPM courante ni le statut d'une compétence ne sont saisis ou stockés comme vérité : ils sont recalculés par des fonctions pures à partir des `practice_logs` (`user_competencies` n'est qu'une copie pour l'affichage et le planner).

**Conséquence.** Une seule source de vérité (le réalisé), règles testables, pas d'état à réparer.

## 4. Primitives shadcn écrites à la main

**Décision.** `components.json` est présent, mais les quelques primitives (`button`, `field`) ont été écrites directement au style de la maquette plutôt que générées puis restylées.

**Conséquence.** `pnpm dlx shadcn add <composant>` reste utilisable ; tout composant ajouté doit être restylé d'après la maquette.
