-- NEUROTRACK · Comunidad (foros compartidos sobre migraña)
--
-- A diferencia de las tablas clínicas, estas filas son visibles para todas las personas
-- con cuenta. Por eso:
--   * Nunca contienen datos clínicos ni el email: solo seudónimo, título y texto.
--   * Cada persona solo escribe y borra lo suyo (RLS); ocultar y contar respuestas lo hacen
--     disparadores con privilegios, no la app.
--   * Con REPORT_HIDE_THRESHOLD (3) reportes de personas distintas, el contenido se oculta.
--   * Al borrar la cuenta, todo lo publicado se borra en cascada.
--   * Sin acceso para el rol anónimo.

create table public.community_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  alias text not null check (char_length(alias) between 3 and 24 and alias !~ '@'),
  rules_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index community_profiles_alias on public.community_profiles (lower(alias));

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.community_profiles (user_id) on delete cascade,
  category text not null check (category in ('tips', 'experiences', 'questions', 'support')),
  title text not null check (char_length(title) between 5 and 120),
  body text not null check (char_length(body) between 10 and 4000),
  hidden boolean not null default false,
  reply_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index community_posts_created on public.community_posts (created_at desc) where deleted_at is null and not hidden;

create table public.community_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.community_profiles (user_id) on delete cascade,
  body text not null check (char_length(body) between 2 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index community_replies_post on public.community_replies (post_id, created_at);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'reply')),
  target_id uuid not null,
  reason text not null check (reason in ('medical_advice', 'personal_data', 'offensive', 'spam', 'other')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_kind, target_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────
alter table public.community_profiles enable row level security;
alter table public.community_profiles force row level security;
alter table public.community_posts enable row level security;
alter table public.community_posts force row level security;
alter table public.community_replies enable row level security;
alter table public.community_replies force row level security;
alter table public.community_reports enable row level security;
alter table public.community_reports force row level security;

revoke all on public.community_profiles, public.community_posts, public.community_replies,
  public.community_reports from anon, authenticated;

-- Seudónimos: los ve cualquier persona con cuenta; cada una crea y cambia el suyo.
grant select, insert, delete on public.community_profiles to authenticated;
grant update (alias, rules_version, updated_at) on public.community_profiles to authenticated;
create policy "leer_seudonimos" on public.community_profiles for select to authenticated using (true);
create policy "crear_mi_seudonimo" on public.community_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "cambiar_mi_seudonimo" on public.community_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "borrar_mi_seudonimo" on public.community_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Temas: se leen los visibles; se crean como uno mismo; solo se puede marcar como borrado lo propio.
grant select on public.community_posts to authenticated;
grant insert (category, title, body) on public.community_posts to authenticated;
grant update (deleted_at, updated_at) on public.community_posts to authenticated;
create policy "leer_temas_visibles" on public.community_posts for select to authenticated
  using (deleted_at is null and not hidden);
create policy "publicar_como_yo" on public.community_posts for insert to authenticated
  with check ((select auth.uid()) = author_id);
create policy "borrar_mis_temas" on public.community_posts for update to authenticated
  using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);

grant select on public.community_replies to authenticated;
grant insert (post_id, body) on public.community_replies to authenticated;
grant update (deleted_at, updated_at) on public.community_replies to authenticated;
create policy "leer_respuestas_visibles" on public.community_replies for select to authenticated
  using (deleted_at is null and not hidden);
create policy "responder_como_yo" on public.community_replies for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (select 1 from public.community_posts p where p.id = post_id and p.deleted_at is null and not p.hidden)
  );
create policy "borrar_mis_respuestas" on public.community_replies for update to authenticated
  using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);

-- Reportes: cada persona solo ve los suyos (para dejar de ver lo que reportó).
grant select on public.community_reports to authenticated;
grant insert (target_kind, target_id, reason) on public.community_reports to authenticated;
create policy "ver_mis_reportes" on public.community_reports for select to authenticated
  using ((select auth.uid()) = reporter_id);
create policy "reportar_como_yo" on public.community_reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id);

-- ── Disparadores ──────────────────────────────────────────────────────────

-- Publicar exige haber aceptado las normas vigentes. Cambiar la versión aquí y en
-- COMMUNITY_RULES_VERSION (src/domain/community.ts) vuelve a pedirlas.
create or replace function public.community_assert_rules() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.community_profiles c where c.user_id = new.author_id and c.rules_version = '2026-10'
  ) then
    raise exception 'Acepta las normas de la comunidad para participar';
  end if;
  return new;
end $$;

create trigger community_posts_rules before insert on public.community_posts
  for each row execute function public.community_assert_rules();
create trigger community_replies_rules before insert on public.community_replies
  for each row execute function public.community_assert_rules();

-- Número de respuestas visibles de cada tema.
create or replace function public.community_count_replies() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.community_posts p
     set reply_count = (select count(*) from public.community_replies r
                         where r.post_id = p.id and r.deleted_at is null and not r.hidden)
   where p.id = coalesce(new.post_id, old.post_id);
  return null;
end $$;

create trigger community_replies_count after insert or update or delete on public.community_replies
  for each row execute function public.community_count_replies();

-- No se reporta lo propio; con suficientes reportes distintos el contenido se oculta.
create or replace function public.community_handle_report() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  author uuid;
  reports int;
begin
  if new.target_kind = 'post' then
    select author_id into author from public.community_posts where id = new.target_id;
  else
    select author_id into author from public.community_replies where id = new.target_id;
  end if;
  if author is null then raise exception 'El contenido no existe'; end if;
  if author = new.reporter_id then raise exception 'No puedes reportar lo que escribiste'; end if;

  select count(distinct reporter_id) into reports from public.community_reports
   where target_kind = new.target_kind and target_id = new.target_id;
  if reports >= 3 then
    if new.target_kind = 'post' then
      update public.community_posts set hidden = true where id = new.target_id;
    else
      update public.community_replies set hidden = true where id = new.target_id;
    end if;
  end if;
  return null;
end $$;

create trigger community_reports_handle after insert on public.community_reports
  for each row execute function public.community_handle_report();
