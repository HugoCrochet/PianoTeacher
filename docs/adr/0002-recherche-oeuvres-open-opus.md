# ADR 0002 — Recherche d'œuvres avec Open Opus

Date : 2026-11-14 · Statut : accepté

## Contexte

Ajouter un morceau se faisait entièrement à la main. L'utilisateur veut chercher une œuvre (compositeur, titre, courant) et récupérer sa partition le plus simplement possible. Contraintes du projet : aucun service payant ni clé d'API, aucune donnée personnelle envoyée à un tiers, pas de partition protégée, coût nul.

Sources étudiées :

| Source | Verdict |
|---|---|
| **Open Opus** (`api.openopus.org`) | Retenue. REST/JSON, gratuite, sans clé ; compositeurs (dates, époque) et œuvres avec genre `Keyboard` et indicateur « populaire ». |
| DOREMUS / BnF | Très riche mais SPARQL : disproportionné pour un formulaire d'ajout. |
| IMSLP (API) | Peu fiable ; téléchargement automatisé des fichiers contraire à leurs conditions (avertissement + délai pour les non-abonnés), statut des droits variable selon le pays et l'édition. |
| MusicBrainz | Peu adapté au classique, 1 requête/s, exige un e-mail de contact dans chaque requête (donnée personnelle). |

## Décision

1. **Recherche Open Opus côté serveur uniquement** (`features/repertoire/server/open-opus.ts`). Seuls les mots recherchés, traduits en termes anglais, sont transmis. Réponses validées par Zod (données externes non fiables), mises en cache 24 h (`fetch` + `next.revalidate`), abandon après 5 s. En cas d'échec : message « Recherche indisponible », la saisie manuelle reste possible.
2. **Œuvres pour clavier uniquement**, populaires d'abord. Titres traduits en français pour les formes courantes (fonction pure testée) ; la difficulté reste une estimation de l'utilisateur (Open Opus ne la fournit pas).
3. **Partition : pas de téléchargement automatique.** « Choisir » pré-remplit un lien de **recherche** IMSLP ; l'utilisateur choisit une édition libre de droits dans son pays, la télécharge et l'importe (flux PDF existant). Après l'ajout, la fiche s'ouvre sur la section Partition.
4. **Courant** (`period`) ajouté aux morceaux et au catalogue de suggestions. Les époques d'Open Opus sont regroupées en quatre familles (baroque, classique, romantique, moderne) ; Debussy, Ravel et Satie sont rangés en « moderne ». L'interface n'affiche qu'un « genre » : ces quatre familles, musique de film, autre.
5. Mention « Données : Open Opus » sur l'écran de recherche.

## Conséquences

- Nouvelle dépendance réseau **facultative** : sans Open Opus, l'application fonctionne entièrement.
- Le code d'Open Opus est sous GPL-3.0 ; le site décrit ses métadonnées comme « libres et ouvertes » sans licence de données explicite. Nous n'affichons que des faits (titres, noms, dates) à la demande et ne recopions pas leur base ; l'attribution est affichée. À revoir si une licence de données est publiée.
- Musique de film et œuvres absentes : saisie manuelle et suggestions curées, comme avant.
- `OPEN_OPUS_BASE_URL` (facultatif, serveur) permet de pointer vers un faux service en test ; par défaut l'API publique.
