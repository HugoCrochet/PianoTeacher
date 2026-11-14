-- Piano Coach — courant (époque) des morceaux, aligné sur les époques d'Open Opus
-- (docs/adr/0002-recherche-oeuvres-open-opus.md). Null = non précisé (ex. musique de film).

alter table public.user_repertoire
  add column period text check (period in (
    'medieval', 'renaissance', 'baroque', 'classical', 'early_romantic', 'romantic',
    'late_romantic', 'twentieth_century', 'post_war', 'twenty_first_century'));

alter table public.repertoire_catalog
  add column period text check (period in (
    'medieval', 'renaissance', 'baroque', 'classical', 'early_romantic', 'romantic',
    'late_romantic', 'twentieth_century', 'post_war', 'twenty_first_century'));

update public.repertoire_catalog c set period = v.period
from (values
  ('petzold-menuet-sol', 'baroque'),
  ('bach-prelude-do', 'baroque'),
  ('mozart-menuet-fa', 'classical'),
  ('clementi-sonatine-1', 'classical'),
  ('beethoven-lettre-elise', 'early_romantic'),
  ('chopin-prelude-mi-mineur', 'romantic'),
  ('chopin-valse-la-mineur', 'romantic'),
  ('schumann-melodie', 'romantic'),
  ('schumann-gai-laboureur', 'romantic'),
  ('burgmuller-arabesque', 'romantic'),
  ('tchaikovski-vieille-chanson', 'romantic'),
  ('debussy-petit-negre', 'late_romantic'),
  ('satie-gymnopedie-1', 'late_romantic')
) as v (slug, period)
where c.slug = v.slug;

-- Les morceaux déjà ajoutés depuis le catalogue reprennent son courant.
update public.user_repertoire r set period = c.period
from public.repertoire_catalog c
where r.catalog_id = c.id and r.period is null;

-- Le « niveau d'usage » (Confort / Progression / Challenge) n'est plus saisi : tous les morceaux
-- reviennent à la valeur neutre, pour qu'aucun réglage invisible ne limite le programme
-- (une pièce « challenge » n'était proposée que les jours de séance longue).
update public.user_repertoire set tier = 'growth' where tier <> 'growth';
