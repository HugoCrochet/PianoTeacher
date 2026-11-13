-- Piano Coach — schéma initial (voir docs/ARCHITECTURE.md §3, §5, §6)
-- Catalogue : lecture seule pour le client. Données personnelles : RLS par user_id.

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  domain text not null check (domain in ('technique', 'scales_harmony', 'reading_rhythm', 'improvisation')),
  level smallint not null check (level between 1 and 5),
  position smallint not null,
  description text not null default ''
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  domain text not null check (domain in ('technique', 'scales_harmony', 'reading_rhythm', 'improvisation')),
  level smallint not null check (level between 1 and 5),
  objective text not null,
  instructions text not null,
  estimated_minutes smallint not null check (estimated_minutes between 1 and 60),
  key_signature text,
  bpm_target smallint check (bpm_target between 20 and 300),
  bpm_increment smallint not null default 4 check (bpm_increment between 1 and 20),
  source_type text not null check (source_type in ('original', 'public_domain', 'reference')),
  source_url text
);
create index exercises_domain_idx on public.exercises (domain, level);

create table public.exercise_competencies (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  competency_id uuid not null references public.competencies (id) on delete cascade,
  weight smallint not null default 1 check (weight between 1 and 3),
  primary key (exercise_id, competency_id)
);
create index exercise_competencies_competency_idx on public.exercise_competencies (competency_id);

create table public.repertoire_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  composer text not null,
  style text not null check (style in ('classical', 'film', 'other')),
  level smallint not null check (level between 1 and 5),
  tier text not null check (tier in ('comfort', 'growth', 'challenge')),
  source_type text not null check (source_type in ('public_domain', 'reference')),
  source_url text,
  rights_note text not null default ''
);

-- ---------------------------------------------------------------------------
-- Données personnelles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  timezone text not null default 'Europe/Paris',
  weekday_minutes smallint not null default 25 check (weekday_minutes between 5 and 180),
  weekend_minutes smallint not null default 60 check (weekend_minutes between 5 and 180),
  -- Jours de pratique ISO : 1 = lundi … 7 = dimanche
  practice_days smallint[] not null default '{1,2,3,4,5,6,7}',
  show_streak boolean not null default true,
  -- { "technique": 1, ... } : 0 = moins, 1 = normal, 2 = plus
  domain_preferences jsonb not null default '{}'::jsonb,
  -- { "technique": 2, ... } : niveau auto-évalué 1 à 3 par domaine
  self_assessment jsonb not null default '{}'::jsonb,
  challenge_level text not null default 'balanced' check (challenge_level in ('gentle', 'balanced', 'ambitious')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_competencies (
  user_id uuid not null references auth.users (id) on delete cascade,
  competency_id uuid not null references public.competencies (id) on delete cascade,
  status text not null check (status in ('upcoming', 'learning', 'consolidating', 'acquired')),
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, competency_id)
);

create table public.pdf_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) <= 200),
  mime_type text not null check (mime_type = 'application/pdf'),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 20971520),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index pdf_assets_user_idx on public.pdf_assets (user_id);

create table public.user_repertoire (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  catalog_id uuid references public.repertoire_catalog (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  composer text not null default '' check (char_length(composer) <= 120),
  style text not null default 'classical' check (style in ('classical', 'film', 'other')),
  level smallint check (level between 1 and 5),
  felt_difficulty smallint check (felt_difficulty between 1 and 5),
  tier text not null default 'growth' check (tier in ('comfort', 'growth', 'challenge')),
  status text not null default 'to_discover' check (status in ('to_discover', 'active', 'paused', 'completed')),
  current_step text not null default '' check (char_length(current_step) <= 200),
  notes text not null default '' check (char_length(notes) <= 4000),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  pdf_asset_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (pdf_asset_id, user_id) references public.pdf_assets (id, user_id)
);
create index user_repertoire_user_idx on public.user_repertoire (user_id, status);
create index user_repertoire_pdf_idx on public.user_repertoire (pdf_asset_id, user_id);
create index user_repertoire_catalog_idx on public.user_repertoire (catalog_id);

create table public.practice_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  planner_version text not null,
  generated_at timestamptz not null default now(),
  settings_snapshot jsonb not null default '{}'::jsonb,
  unique (user_id, week_start),
  unique (id, user_id)
);

-- Travail PLANIFIÉ. Ne compte jamais dans les statistiques.
create table public.planned_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  task_date date not null,
  position smallint not null,
  domain text not null check (domain in ('technique', 'scales_harmony', 'reading_rhythm', 'improvisation', 'repertoire')),
  exercise_id uuid references public.exercises (id) on delete cascade,
  user_repertoire_id uuid,
  planned_minutes smallint not null check (planned_minutes between 1 and 180),
  target_bpm smallint check (target_bpm between 20 and 300),
  reason text not null,
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  is_user_modified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (plan_id, user_id) references public.practice_plans (id, user_id) on delete cascade,
  foreign key (user_repertoire_id, user_id) references public.user_repertoire (id, user_id) on delete cascade,
  check (num_nonnulls(exercise_id, user_repertoire_id) = 1),
  check ((domain = 'repertoire') = (user_repertoire_id is not null))
);
create index planned_tasks_user_date_idx on public.planned_tasks (user_id, task_date, position);
create index planned_tasks_plan_idx on public.planned_tasks (plan_id, user_id);
create index planned_tasks_exercise_idx on public.planned_tasks (exercise_id);
create index planned_tasks_repertoire_idx on public.planned_tasks (user_repertoire_id, user_id);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_date date not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  actual_minutes smallint not null default 0 check (actual_minutes >= 0),
  unique (user_id, session_date),
  unique (id, user_id)
);

-- Travail RÉALISÉ. Seule source des statistiques.
create table public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  planned_task_id uuid references public.planned_tasks (id) on delete set null,
  domain text not null check (domain in ('technique', 'scales_harmony', 'reading_rhythm', 'improvisation', 'repertoire')),
  exercise_id uuid references public.exercises (id) on delete cascade,
  user_repertoire_id uuid,
  practiced_at timestamptz not null default now(),
  practice_date date not null,
  actual_minutes smallint not null check (actual_minutes between 1 and 180),
  bpm smallint check (bpm between 20 and 300),
  result text not null check (result in ('success', 'retry')),
  foreign key (session_id, user_id) references public.practice_sessions (id, user_id) on delete cascade,
  foreign key (user_repertoire_id, user_id) references public.user_repertoire (id, user_id) on delete cascade,
  check (num_nonnulls(exercise_id, user_repertoire_id) = 1),
  check ((domain = 'repertoire') = (user_repertoire_id is not null))
);
create index practice_logs_user_date_idx on public.practice_logs (user_id, practice_date);
create index practice_logs_session_idx on public.practice_logs (session_id, user_id);
create index practice_logs_exercise_idx on public.practice_logs (exercise_id);
create index practice_logs_repertoire_idx on public.practice_logs (user_repertoire_id, user_id);
create index practice_logs_task_idx on public.practice_logs (planned_task_id);

-- ---------------------------------------------------------------------------
-- Droits et RLS
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on public.competencies, public.exercises, public.exercise_competencies, public.repertoire_catalog
  to authenticated;
grant select, insert, update, delete on
  public.profiles, public.user_competencies, public.pdf_assets, public.user_repertoire,
  public.practice_plans, public.planned_tasks, public.practice_sessions, public.practice_logs
  to authenticated;

alter table public.competencies enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_competencies enable row level security;
alter table public.repertoire_catalog enable row level security;
alter table public.profiles enable row level security;
alter table public.user_competencies enable row level security;
alter table public.pdf_assets enable row level security;
alter table public.user_repertoire enable row level security;
alter table public.practice_plans enable row level security;
alter table public.planned_tasks enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_logs enable row level security;

-- Catalogue : lecture seule pour un utilisateur connecté, aucune écriture depuis le client.
create policy "catalogue lisible" on public.competencies for select to authenticated using (true);
create policy "catalogue lisible" on public.exercises for select to authenticated using (true);
create policy "catalogue lisible" on public.exercise_competencies for select to authenticated using (true);
create policy "catalogue lisible" on public.repertoire_catalog for select to authenticated using (true);

-- Profil : la clé est l'identifiant de l'utilisateur.
create policy "profil : lecture" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profil : création" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "profil : modification" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profil : suppression" on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

-- Tables personnelles : propriétaire uniquement, pour les quatre opérations.
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_competencies', 'pdf_assets', 'user_repertoire', 'practice_plans',
    'planned_tasks', 'practice_sessions', 'practice_logs'
  ]
  loop
    execute format(
      'create policy "propriétaire : lecture" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "propriétaire : création" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "propriétaire : modification" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "propriétaire : suppression" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Storage : partitions PDF personnelles (bucket privé)
-- Chemin : <user_id>/<uuid>.pdf — le premier segment doit être l'utilisateur connecté.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('personal-scores', 'personal-scores', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 20971520, allowed_mime_types = array['application/pdf'];

create policy "partitions : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'personal-scores' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "partitions : envoi" on storage.objects for insert to authenticated
  with check (bucket_id = 'personal-scores' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "partitions : remplacement" on storage.objects for update to authenticated
  using (bucket_id = 'personal-scores' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'personal-scores' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "partitions : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'personal-scores' and (storage.foldername(name))[1] = (select auth.uid())::text);
