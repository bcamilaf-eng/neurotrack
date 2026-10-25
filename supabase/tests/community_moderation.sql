-- Comprueba la moderación: solo moderadores ven la cola y deciden; nadie se nombra moderador desde la app.
-- Uso: después de community_rls.sql. Las líneas «debe fallar» deben terminar en ERROR.
\set ON_ERROR_STOP off
insert into auth.users values
  ('a0000000-0000-0000-0000-00000000000a','autora@x.com'),
  ('b0000000-0000-0000-0000-00000000000b','r1@x.com'),
  ('c0000000-0000-0000-0000-00000000000c','r2@x.com'),
  ('d0000000-0000-0000-0000-00000000000d','r3@x.com'),
  ('e0000000-0000-0000-0000-00000000000e','moderadora@x.com');
insert into public.community_moderators (user_id) values ('e0000000-0000-0000-0000-00000000000e');
set role authenticated;

set request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';
insert into public.community_profiles (user_id, alias, rules_version) values ('a0000000-0000-0000-0000-00000000000a', 'Autora', '2026-10');
insert into public.community_posts (category, title, body)
  values ('tips', 'Pastillas', 'Tómate dos al día.');
select set_config('t.post', (select id::text from public.community_posts where title = 'Pastillas'), false);
\echo '--- debe fallar: ver la cola sin ser moderadora'
select * from public.community_moderation_queue();
\echo '--- debe fallar: restaurar sin ser moderadora'
select public.community_moderate('post', current_setting('t.post')::uuid, 'remove');
\echo '--- debe fallar: nombrarse moderadora'
insert into public.community_moderators (user_id) values ('a0000000-0000-0000-0000-00000000000a');
select public.community_is_moderator() as autora_modera;

set request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';
insert into public.community_reports (target_kind, target_id, reason) values ('post', current_setting('t.post')::uuid, 'medical_advice');
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-00000000000c';
insert into public.community_reports (target_kind, target_id, reason) values ('post', current_setting('t.post')::uuid, 'medical_advice');
set request.jwt.claim.sub = 'd0000000-0000-0000-0000-00000000000d';
insert into public.community_reports (target_kind, target_id, reason) values ('post', current_setting('t.post')::uuid, 'spam');

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-00000000000e';
select count(*) as cola_moderadora from public.community_moderation_queue() where hidden and reports = 3;
select public.community_moderate('post', current_setting('t.post')::uuid, 'restore');
set request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';
select count(*) as visible_tras_restaurar from public.community_posts where id = current_setting('t.post')::uuid;
set request.jwt.claim.sub = 'e0000000-0000-0000-0000-00000000000e';
select count(*) as cola_tras_restaurar from public.community_moderation_queue();
select public.community_moderate('post', current_setting('t.post')::uuid, 'remove');
set request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';
select count(*) as visible_tras_eliminar from public.community_posts where id = current_setting('t.post')::uuid;
reset role;
