-- Comprueba el aislamiento por usuario (RLS), las restricciones y el borrado en cascada.
-- Uso: ver docs/despliegue.md. Las líneas marcadas «debe fallar» deben terminar en ERROR.
\set ON_ERROR_STOP off
grant select, insert, update, delete on all tables in schema public to authenticated, anon;
insert into auth.users values ('11111111-1111-1111-1111-111111111111','a@x.com'),('22222222-2222-2222-2222-222222222222','b@x.com');
select count(*) as perfiles_creados from public.profiles;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.headache_episodes (id,user_id,date,started_at,ended_at,ongoing,duration_min,type,intensity,max_intensity,created_at,updated_at)
 values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','2026-10-05','2026-10-05T17:00Z','2026-10-05T21:00Z',false,240,'migraine',8,8,now(),now());
\echo '--- debe fallar: escribir como otro usuario'
insert into public.headache_episodes (id,user_id,date,started_at,ongoing,type,intensity,max_intensity,created_at,updated_at)
 values ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','2026-10-05','2026-10-05T17:00Z',true,'migraine',8,8,now(),now());
\echo '--- debe fallar: intensidad 12'
insert into public.headache_episodes (id,user_id,date,started_at,ongoing,type,intensity,max_intensity,created_at,updated_at)
 values ('aaaaaaaa-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','2026-10-05','2026-10-05T17:00Z',true,'migraine',12,12,now(),now());
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as episodios_visibles_para_b from public.headache_episodes;
update public.headache_episodes set intensity = 1;
\echo '--- debe fallar: síntoma de B en episodio de A'
insert into public.symptoms (id,user_id,episode_id,type,created_at,updated_at) values (gen_random_uuid(),'22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000001','nausea',now(),now());
reset role;
select intensity as intensidad_tras_update_de_b from public.headache_episodes;
set role anon;
select count(*) as visibles_anon from public.headache_episodes;
reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select count(*) as episodios_tras_borrar_cuenta from public.headache_episodes;
