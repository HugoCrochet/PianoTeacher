-- Piano Coach — Étape 3, phase B « Pédagogie visible » (docs/ROADMAP.md).
-- B1 : tonalité travaillée par tâche et par résultat ; exercices transposables.
-- B2 : passages de morceaux (table personnelle, RLS propriétaire).
-- B4 : objectif concret de chaque compétence.

-- ---------------------------------------------------------------------------
-- B1 — Tonalités
-- ---------------------------------------------------------------------------

-- Mode d'un exercice que le planner transpose dans la tonalité du jour (null = tonalité fixe).
alter table public.exercises
  add column key_mode text check (key_mode in ('major', 'minor'));

update public.exercises set key_mode = 'major', key_signature = null,
  instructions = 'Dans la tonalité du jour : gamme sur une octave, mains séparées puis ensemble, puis l''accord parfait plaqué et arpégé. Si tout va bien, ajoute les deux tonalités voisines du cycle. Note celles qui résistent.'
where slug = 'cycle-des-quintes';

update public.exercises set key_mode = 'major', key_signature = null,
  instructions = 'Dans la tonalité du jour : I–IV–V–I en gardant les notes communes. Main gauche joue la fondamentale. Dis le nom des accords à voix haute.'
where slug = 'cadence-i-iv-v';

update public.exercises set key_mode = 'minor', key_signature = null,
  instructions = 'Dans la tonalité du jour : joue les trois formes à la suite — naturelle, harmonique (sensible haussée), mélodique (6e et 7e haussées en montant, naturelles en descendant).'
where slug = 'mineures-trois-formes';

-- Tonalités reconnues : 12 majeures et leurs 12 relatives mineures.
alter table public.planned_tasks
  add column key_signature text check (key_signature in (
    'Do majeur', 'Sol majeur', 'Ré majeur', 'La majeur', 'Mi majeur', 'Si majeur', 'Fa♯ majeur',
    'Ré♭ majeur', 'La♭ majeur', 'Mi♭ majeur', 'Si♭ majeur', 'Fa majeur',
    'La mineur', 'Mi mineur', 'Si mineur', 'Fa♯ mineur', 'Do♯ mineur', 'Sol♯ mineur', 'Ré♯ mineur',
    'Si♭ mineur', 'Fa mineur', 'Do mineur', 'Sol mineur', 'Ré mineur'));

alter table public.practice_logs
  add column key_signature text check (key_signature in (
    'Do majeur', 'Sol majeur', 'Ré majeur', 'La majeur', 'Mi majeur', 'Si majeur', 'Fa♯ majeur',
    'Ré♭ majeur', 'La♭ majeur', 'Mi♭ majeur', 'Si♭ majeur', 'Fa majeur',
    'La mineur', 'Mi mineur', 'Si mineur', 'Fa♯ mineur', 'Do♯ mineur', 'Sol♯ mineur', 'Ré♯ mineur',
    'Si♭ mineur', 'Fa mineur', 'Do mineur', 'Sol mineur', 'Ré mineur'));

-- ---------------------------------------------------------------------------
-- B2 — Passages de morceaux
-- ---------------------------------------------------------------------------

create table public.piece_passages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_repertoire_id uuid not null,
  position smallint not null check (position between 1 and 200),
  label text not null check (char_length(label) between 1 and 80),
  target_bpm smallint check (target_bpm between 20 and 300),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (user_repertoire_id, user_id) references public.user_repertoire (id, user_id) on delete cascade
);
create index piece_passages_piece_idx on public.piece_passages (user_repertoire_id, user_id, position);

alter table public.planned_tasks
  add column passage_id uuid,
  add foreign key (passage_id, user_id) references public.piece_passages (id, user_id) on delete set null (passage_id),
  add check (passage_id is null or user_repertoire_id is not null);
create index planned_tasks_passage_idx on public.planned_tasks (passage_id, user_id);

alter table public.practice_logs
  add column passage_id uuid,
  add foreign key (passage_id, user_id) references public.piece_passages (id, user_id) on delete set null (passage_id),
  add check (passage_id is null or user_repertoire_id is not null);
create index practice_logs_passage_idx on public.practice_logs (passage_id, user_id);

grant select, insert, update, delete on public.piece_passages to authenticated;
alter table public.piece_passages enable row level security;

create policy "propriétaire : lecture" on public.piece_passages for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "propriétaire : création" on public.piece_passages for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "propriétaire : modification" on public.piece_passages for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "propriétaire : suppression" on public.piece_passages for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- B4 — Objectif concret des compétences
-- ---------------------------------------------------------------------------

alter table public.competencies add column objective text not null default '';

update public.competencies c set objective = v.objective
from (values
  ('tech-cinq-doigts',     'Jouer do–ré–mi–fa–sol aller-retour à 72 BPM, mains ensemble, sans qu''un doigt ressorte.'),
  ('tech-legato-staccato', 'Enchaîner une montée legato et une descente staccato sans changer de tempo, puis une main de chaque toucher.'),
  ('tech-independance',    'Tenir des noires à une main et des croches à l''autre pendant huit mesures, puis échanger les rôles.'),
  ('tech-passage-pouce',   'Jouer une gamme d''une octave à 72 BPM sans accent audible au passage du pouce.'),
  ('tech-alberti',         'Accompagner une mélodie simple en basse d''Alberti, régulière et plus douce que la main droite.'),
  ('tech-velocite',        'Jouer une étude courte à 90 BPM en restant détendu et sans fausse note.'),
  ('gam-maj-1',            'Jouer do, sol et fa majeur sur une octave, mains ensemble, avec le bon doigté du premier coup.'),
  ('gam-accords-parfaits', 'Plaquer un accord parfait majeur ou mineur et ses deux renversements sur n''importe quelle note blanche.'),
  ('gam-maj-2',            'Jouer ré, la, si♭ et mi♭ majeur sur deux octaves, mains ensemble, sans t''arrêter.'),
  ('gam-min-1',            'Jouer la, mi et ré mineur en formes naturelle et harmonique, en entendant la sensible.'),
  ('gam-arpeges',          'Jouer les arpèges de do, sol et fa sur deux octaves avec un passage du pouce sans à-coup.'),
  ('gam-cadence',          'Enchaîner I–IV–V–I dans trois tonalités sans regarder les mains.'),
  ('gam-maj-3',            'Jouer chacune des 12 gammes majeures sur une octave, mains ensemble.'),
  ('gam-min-2',            'Jouer les trois formes mineures dans au moins six tonalités en les nommant.'),
  ('gam-septiemes',        'Construire et nommer l''accord de septième de chaque degré d''une gamme majeure, puis enchaîner II–V–I.'),
  ('lec-fa-portee',        'Nommer vingt notes de la portée en clé de fa en moins d''une minute.'),
  ('lec-rythmes-simples',  'Frapper huit mesures de noires, blanches et croches mélangées avec le métronome, sans décrocher.'),
  ('lec-fa-hors-portee',   'Lire les notes jusqu''à deux lignes supplémentaires en clé de fa sans compter les lignes.'),
  ('lec-intervalles',      'Jouer une mélodie simple en ne lisant que la première note et les intervalles.'),
  ('lec-syncopes',         'Jouer huit mesures avec notes pointées et syncopes en gardant la main gauche régulière.'),
  ('lec-deux-cles',        'Déchiffrer une pièce facile à deux mains, lentement mais sans t''arrêter.'),
  ('lec-triolets',         'Alterner croches et triolets sur une pulsation stable pendant huit mesures.'),
  ('imp-cinq-notes',       'Improviser une minute sur cinq notes avec des phrases qui ont un début et une fin.'),
  ('imp-ostinato',         'Tenir un ostinato de main gauche pendant deux minutes en improvisant à la main droite.'),
  ('imp-i-iv-v',           'Improviser sur une grille I–IV–V en changeant d''accord au bon moment pendant trois tours.'),
  ('imp-motifs',           'Développer un motif de deux mesures en au moins trois variations reconnaissables.'),
  ('imp-grille-riche',     'Improviser une mélodie sur une grille avec accords mineurs en visant les notes de l''accord.')
) as v (slug, objective)
where c.slug = v.slug;
