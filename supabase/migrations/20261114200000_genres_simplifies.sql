-- Piano Coach — courants regroupés en 4 familles : baroque, classical, romantic, modern.
-- Le répertoire n'affiche plus qu'un « genre » (ces 4 familles + musique de film + autre).

alter table public.user_repertoire drop constraint user_repertoire_period_check;
alter table public.repertoire_catalog drop constraint repertoire_catalog_period_check;

update public.user_repertoire set period = case
  when period in ('early_romantic', 'romantic', 'late_romantic') then 'romantic'
  when period in ('twentieth_century', 'post_war', 'twenty_first_century') then 'modern'
  when period in ('baroque', 'classical') then period
  else null end
where period is not null;

update public.repertoire_catalog set period = case
  when period in ('early_romantic', 'romantic', 'late_romantic') then 'romantic'
  when period in ('twentieth_century', 'post_war', 'twenty_first_century') then 'modern'
  when period in ('baroque', 'classical') then period
  else null end
where period is not null;

-- Debussy, Ravel et Satie : rangés en « Moderne » plutôt qu'en « Romantique ».
update public.user_repertoire set period = 'modern'
where period = 'romantic' and (composer ilike '%Debussy%' or composer ilike '%Ravel%' or composer ilike '%Satie%');
update public.repertoire_catalog set period = 'modern'
where period = 'romantic' and (composer ilike '%Debussy%' or composer ilike '%Ravel%' or composer ilike '%Satie%');

alter table public.user_repertoire
  add constraint user_repertoire_period_check check (period in ('baroque', 'classical', 'romantic', 'modern'));
alter table public.repertoire_catalog
  add constraint repertoire_catalog_period_check check (period in ('baroque', 'classical', 'romantic', 'modern'));
