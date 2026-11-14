# Produit — Piano Coach

Source de vérité pour **ce que fait l'application**. Le découpage en étapes est dans [ROADMAP.md](ROADMAP.md), l'apparence dans la [maquette](../piano-coach-maquette.html).

## 1. Vision

Un coach de pratique personnel qui répond chaque jour à trois questions : **quoi travailler, pourquoi, et quelle est l'étape suivante**. La planification aide la pratique sans la transformer en tâche administrative ; l'utilisateur garde toujours la main.

## 2. Utilisateur

- Pianiste en reprise, débutant avancé (à confirmer par une auto-évaluation au premier lancement). Ne pas le traiter en grand débutant, ni supposer que ses anciennes pièces sont encore maîtrisées.
- Clé de sol connue, clé de fa à renforcer. Rythmes complexes difficiles.
- Gammes simples et coordination deux mains déjà pratiquées. Passé de guitariste classique.
- Déjà travaillé : thème de *La La Land*, Valse en la mineur (Chopin, posth.), Prélude en do majeur (Bach), *Alfred's Basic Adult Piano Course*.
- Piano : Roland FP-30X (aucune connexion à l'app).
- Disponibilités par défaut, modifiables : **25 min** du lundi au vendredi, **60 min** le samedi et le dimanche.

## 3. Objectifs de l'utilisateur

1. Reprendre une pratique régulière, sans culpabilité.
2. Consolider technique, coordination et toucher.
3. Couvrir les 12 tonalités (gammes majeures et mineures, arpèges).
4. Mieux lire en clé de fa et gagner en précision rythmique.
5. Développer harmonie et improvisation.
6. Apprendre des pièces classiques, puis des musiques de film.
7. Voir ses progrès avec des données simples : temps, séances, résultats, BPM.

## 4. Les 5 domaines

Toute tâche et tout exercice appartient à **un** domaine. C'est la seule taxonomie (base de données, planner, filtres, graphiques).

| Domaine (`domain`) | Libellé | Contenu |
|---|---|---|
| `technique` | Technique | Hanon/Czerny (en référence), indépendance, articulation, vélocité, contrôle |
| `scales_harmony` | Gammes et harmonie | Gammes majeures/mineures (naturelle, harmonique, mélodique), arpèges, triades, renversements, accords de 7e, progressions |
| `reading_rhythm` | Lecture et rythme | Notes en clés de sol/fa, intervalles, valeurs, silences, mesures simples/composées, syncopes, triolets |
| `improvisation` | Improvisation | Consignes structurées : tonalité, gamme, grille, contrainte rythmique, durée, objectif |
| `repertoire` | Répertoire | Pièces de l'utilisateur |

Les quatre premiers domaines forment le **catalogue d'exercices**. Le répertoire est géré à part.

## 5. Fonctionnalités

### Accueil
Salutation, durée de la séance du jour, série de jours (affichage désactivable), accès aux sections et au parcours pédagogique avec sa progression.

### Séance du jour et programme
- Séance du jour : liste ordonnée de tâches (domaine, intitulé, durée, BPM cible, raison).
- Séance : une tâche à la fois, progression x/y, consigne et objectif. Actions principales `Réussi` et `À retravailler`, BPM atteint optionnel ; `Passer` et `Terminer la séance` en secondaire. Le résultat se corrige avant de passer à la suite ; aucun commentaire obligatoire. On peut interrompre et reprendre la séance.
- Outils de séance :
  - **Minuteur** : compte à rebours sur la durée prévue de la tâche (démarrer / pause / remise à zéro). À la fin, un signal sonore doux et la mention « Temps prévu écoulé » ; le temps continue de compter, rien n'est bloqué. La durée réelle est pré-remplie avec le temps mesuré, arrondi à la minute (minimum 1), et reste modifiable.
  - **Métronome** : démarre au BPM cible de la tâche (60 par défaut), réglable de 30 à 240, y compris pendant qu'il joue. Il s'arrête quand on passe à la tâche suivante.
  - **Écran allumé** : l'écran ne se met pas en veille tant qu'une séance est affichée (si le navigateur le permet).
  - **Mode pupitre** : agrandit texte et boutons pour lire à distance ; réglage mémorisé sur l'appareil.
- Programme de la semaine (lundi → dimanche), ouvert depuis Aujourd'hui (« Voir la semaine ») : voir, remplacer, déplacer ou supprimer une tâche. « Régénérer » prévient si des modifications manuelles existent.

### Exercices
Catalogue filtrable par domaine, niveau, tonalité et durée. Fiche : titre, domaine, niveau, objectif, consigne, durée indicative, tonalité, BPM cible et incrément BPM optionnels, ressource/lien, provenance. Action « Ajouter au programme ».

### Répertoire
- Suggestions curées + ajout libre de pièces personnelles.
- Niveau d'usage : `Confort`, `Progression`, `Challenge`.
- Statut : `À découvrir`, `En cours`, `En pause`, `Terminé`.
- Champs : titre, compositeur, style, difficulté estimée et ressentie, étape en cours (ex. « mesures 9 à 16 »), notes, lien, PDF.
- **Passages** : un morceau peut être découpé en passages (ajout un par un, ou « découper par mesures » : 20 mesures par 8 → 1–8, 9–16, 17–20), chacun avec un tempo visé optionnel. Statut d'après les résultats : `Pas encore travaillé`, `En travail`, `Solide` (au moins 3 réussites dont les 2 dernières). Affichage : dernier BPM « 54 sur 60 visés ». Supprimer un passage garde l'historique.
- Viser 1–2 pièces en cours + éventuellement 1 challenge (indicatif, pas une limite).
- Priorité de style : classique, puis musiques de film, puis le reste.

### Partitions PDF
Import d'un PDF personnel, rattaché à un morceau, consultation dans le navigateur, remplacement et suppression. Taille max 20 Mo (configurable).

### Parcours pédagogique
Suite ordonnée de **compétences** par niveau (ex. « Niveau 2 — lecture en clé de fa : les notes sous la portée »). Chaque compétence a un statut (`À venir`, `En cours`, `En consolidation`, `Acquise`) calculé à partir des résultats des exercices qui la travaillent. Le parcours alimente le planner ; il ne contient pas de leçons rédigées au MVP.
- **Fiche compétence** : objectif concret, description, ce qui manque pour `Acquise` critère par critère (réussites au total, jours différents, réussites d'affilée) et exercices liés avec leur dernier résultat.
- **Les 12 tonalités** : cercle des quintes (majeures à l'extérieur, relatives mineures à l'intérieur) avec trois états, `Jamais jouée`, `Travaillée`, `Bien installée` (au moins 3 réussites). Ne compte que les résultats réels en gammes et harmonie, avec la tonalité de l'exercice ou celle imposée par le planner. Les prochaines tonalités à découvrir sont listées en texte.

### Improvisation : variante du jour
Chaque tâche d'improvisation affiche une variante : tonalité, grille (accords écrits dans la tonalité et degrés), contrainte rythmique et objectif. Tirage déterministe à partir de la date et de l'exercice (même jour → même variante), limité au niveau de l'exercice.

### Progression
Temps de pratique par jour et par semaine, nombre de séances, historique des résultats, courbe BPM par exercice ou morceau, domaines travaillés, compétences en cours. Uniquement à partir des **logs réels**, jamais des tâches planifiées. Pas de score global, pas de mesure de précision ou de timing.

### Paramètres
Accessibles depuis l'accueil (en haut à droite). Profil, jours et durées de pratique, préférences de domaines, niveau de challenge, affichage de la série, export JSON/CSV.

## 6. Règles du planner

Le planner est une fonction pure et déterministe : mêmes entrées → même plan.

**Entrées** : disponibilités, préférences, compétences et statuts, tâches et résultats récents, BPM courants/cibles, morceaux en cours, modifications manuelles.
**Sortie** : tâches datées avec ordre, durée, BPM cible éventuel et **raison lisible**.

1. **Durée** : la séance tient dans le temps du jour ; ne jamais le dépasser sans accord.
2. **Variété** : les 5 domaines sont couverts sur la semaine (pas forcément chaque jour). Une séance type de 25 min ressemble à 5 technique / 5 gammes / 5 lecture / 10 répertoire, sans être imposée.
3. **Répertoire** : présent dans la plupart des séances, sans évincer les fondamentaux.
4. **À retravailler** : une tâche non validée revient dans une séance ultérieure, espacée, pas mécaniquement chaque jour.
5. **Pas de dette** : une séance ou tâche manquée est ignorée, jamais reportée ni accumulée.
6. **BPM** : augmenter la cible seulement après **3 réussites consécutives** au BPM cible, d'un incrément propre à l'exercice (défaut +4 BPM). Une réussite isolée ne suffit jamais.
7. **Compétences** : une compétence n'est jamais `Acquise` sur une seule réussite.
8. **Raison** : chaque tâche explique sa présence (ex. « à revoir après deux séances non validées », « +4 BPM après 3 réussites »).
9. **Contrôle utilisateur** : une tâche modifiée à la main n'est jamais écrasée par une régénération sans confirmation explicite.
10. **Premier lancement** : sans historique, produire un plan cohérent à partir du seed et de l'auto-évaluation.
11. **Tonalités** : un exercice transposable reçoit la tonalité du jour — d'abord une tonalité jamais jouée (la plus simple), sinon la moins travaillée puis la plus ancienne, sans doublon dans la semaine si possible. Altérations ouvertes selon le niveau en gammes : 2 (niveau 1), 4 (niveau 2), toutes (niveau 3).
12. **Passages** : pour un morceau découpé, la tâche cible le passage le plus fragile : raté la dernière fois, puis en travail (le moins de réussites), puis le suivant jamais travaillé dans l'ordre du morceau, enfin les passages solides en entretien. Le tempo visé du passage devient le BPM cible.

## 7. Contenu et droits

- Seed = exercices originaux, œuvres du domaine public et **liens** vers des sources légales. Chaque élément porte sa provenance (`original`, `public_domain`, `reference`, `user_upload`).
- Les méthodes Hanon, Czerny et Alfred peuvent être citées en référence, jamais copiées ni scannées.
- Aucune partition commerciale dans le dépôt ou le seed.

## 8. Hors périmètre (POC et MVP)

MIDI, micro, détection de notes, notation automatique, IA générative/chatbot, éditeur ou rendu de partition, OCR, application native, multi-utilisateur, partage, abonnement, mode hors ligne avec synchronisation.
