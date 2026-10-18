-- Comprueba las reglas de la comunidad: seudónimos, autoría, reportes y borrado en cascada.
-- Uso: después de 00_auth_stub.sql y las migraciones. Las líneas «debe fallar» deben terminar en ERROR.
\set ON_ERROR_STOP off
insert into auth.users values
  ('aaaaaaaa-1111-1111-1111-111111111111','a@x.com'),
  ('bbbbbbbb-2222-2222-2222-222222222222','b@x.com'),
  ('cccccccc-3333-3333-3333-333333333333','c@x.com'),
  ('dddddddd-4444-4444-4444-444444444444','d@x.com');
set role authenticated;

set request.jwt.claim.sub = 'aaaaaaaa-1111-1111-1111-111111111111';
\echo '--- debe fallar: publicar sin seudónimo'
insert into public.community_posts (category, title, body) values ('tips', 'Sin seudónimo', 'Esto no debería entrar.');
insert into public.community_profiles (user_id, alias, rules_version) values ('aaaaaaaa-1111-1111-1111-111111111111', 'Luna', '2026-10');
insert into public.community_posts (id, category, title, body)
  values ('eeeeeeee-0000-0000-0000-000000000001', 'tips', 'Lo que me ayuda', 'Buscar un lugar oscuro.');
\echo '--- debe fallar: publicar como otra persona'
insert into public.community_posts (author_id, category, title, body)
  values ('bbbbbbbb-2222-2222-2222-222222222222', 'tips', 'Suplantación', 'Esto no debería entrar.');
\echo '--- debe fallar: ocultarse o cambiar el contador a mano'
update public.community_posts set reply_count = 99;

set request.jwt.claim.sub = 'bbbbbbbb-2222-2222-2222-222222222222';
\echo '--- debe fallar: seudónimo repetido'
insert into public.community_profiles (user_id, alias, rules_version) values ('bbbbbbbb-2222-2222-2222-222222222222', 'luna', '2026-10');
insert into public.community_profiles (user_id, alias, rules_version) values ('bbbbbbbb-2222-2222-2222-222222222222', 'Sol', '2026-10');
insert into public.community_replies (post_id, body) values ('eeeeeeee-0000-0000-0000-000000000001', 'A mí también.');
update public.community_posts set deleted_at = now() where id = 'eeeeeeee-0000-0000-0000-000000000001';
select count(*) as temas_visibles_para_b from public.community_posts;
insert into public.community_reports (target_kind, target_id, reason) values ('post', 'eeeeeeee-0000-0000-0000-000000000001', 'spam');
set request.jwt.claim.sub = 'cccccccc-3333-3333-3333-333333333333';
insert into public.community_reports (target_kind, target_id, reason) values ('post', 'eeeeeeee-0000-0000-0000-000000000001', 'spam');
select count(*) as reportes_visibles_para_c from public.community_reports;
set request.jwt.claim.sub = 'aaaaaaaa-1111-1111-1111-111111111111';
\echo '--- debe fallar: reportar lo propio'
insert into public.community_reports (target_kind, target_id, reason) values ('post', 'eeeeeeee-0000-0000-0000-000000000001', 'spam');
set request.jwt.claim.sub = 'dddddddd-4444-4444-4444-444444444444';
insert into public.community_reports (target_kind, target_id, reason) values ('post', 'eeeeeeee-0000-0000-0000-000000000001', 'offensive');
select count(*) as temas_tras_tres_reportes from public.community_posts;
reset role;
select reply_count as respuestas_contadas from public.community_posts where id = 'eeeeeeee-0000-0000-0000-000000000001';
set role anon;
\echo '--- debe fallar: el rol anónimo no lee la comunidad'
select count(*) from public.community_posts;
reset role;
delete from auth.users where id = 'aaaaaaaa-1111-1111-1111-111111111111';
select count(*) as temas_tras_borrar_cuenta from public.community_posts;
