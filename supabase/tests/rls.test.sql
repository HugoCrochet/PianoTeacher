-- Tests RLS (pgTAP) : propriétaire, autre utilisateur, anonyme — tables et Storage.
-- Lancer : pnpm test:db
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Deux utilisateurs
insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');

-- ----- Utilisatrice A : crée ses données -----
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-00000000000a', 'A')$$,
  'A crée son profil');
select lives_ok(
  $$insert into public.practice_sessions (id, user_id, session_date)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '2026-11-13')$$,
  'A crée une séance');
select lives_ok(
  $$insert into public.practice_logs (user_id, session_id, domain, exercise_id, practice_date, actual_minutes, bpm, result)
    select '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', e.domain, e.id, '2026-11-13', 5, 72, 'success'
    from public.exercises e where e.slug = 'gamme-do-majeur'$$,
  'A enregistre un résultat');
select lives_ok(
  $$insert into public.pdf_assets (id, user_id, storage_path, original_filename, mime_type, size_bytes)
    values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
            '00000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001.pdf', 'p.pdf', 'application/pdf', 1000)$$,
  'A enregistre un PDF');
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('personal-scores', '00000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001.pdf', '00000000-0000-0000-0000-00000000000a')$$,
  'A dépose un fichier dans son dossier');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('personal-scores', '00000000-0000-0000-0000-00000000000b/intrus.pdf', '00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'A ne peut pas déposer dans le dossier de B');
select throws_ok(
  $$insert into public.practice_sessions (user_id, session_date) values ('00000000-0000-0000-0000-00000000000b', '2026-11-13')$$,
  '42501', null, 'A ne peut pas créer une séance au nom de B');
select throws_ok(
  $$insert into public.exercises (slug, title, domain, level, objective, instructions, estimated_minutes, source_type)
    values ('x', 'x', 'technique', 1, 'x', 'x', 5, 'original')$$,
  '42501', null, 'le catalogue est en lecture seule');
select is((select count(*)::int from public.practice_logs), 1, 'A voit son résultat');
select ok((select count(*) from public.exercises) > 0, 'A lit le catalogue');

-- ----- Utilisateur B : ne voit ni ne modifie rien de A -----
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*)::int from public.profiles), 0, 'B ne voit pas le profil de A');
select is((select count(*)::int from public.practice_sessions), 0, 'B ne voit pas les séances de A');
select is((select count(*)::int from public.practice_logs), 0, 'B ne voit pas les résultats de A');
select is((select count(*)::int from public.pdf_assets), 0, 'B ne voit pas les PDF de A');
select is((select count(*)::int from storage.objects where bucket_id = 'personal-scores'), 0, 'B ne voit pas les fichiers de A');
update public.practice_logs set bpm = 200;
delete from public.practice_sessions;
reset role;
select is((select bpm::int from public.practice_logs where user_id = '00000000-0000-0000-0000-00000000000a'), 72, 'B n''a pas pu modifier le résultat de A');
select is((select count(*)::int from public.practice_sessions where user_id = '00000000-0000-0000-0000-00000000000a'), 1, 'B n''a pas pu supprimer la séance de A');

-- ----- Anonyme : aucun accès -----
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$select count(*) from public.practice_logs$$, '42501', null, 'anonyme : données personnelles refusées');
select throws_ok($$select count(*) from public.exercises$$, '42501', null, 'anonyme : catalogue refusé');

reset role;
select * from finish();
rollback;
