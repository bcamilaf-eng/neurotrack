-- NEUROTRACK · moderación de la comunidad
--
-- Moderadores: personas con cuenta que pueden revisar lo reportado. Solo se añaden desde el
-- panel de Supabase (no hay política de escritura para la app).
-- La app modera a través de funciones con privilegios que comprueban primero que quien llama
-- es moderador: ver la cola (oculto y reportado) y restaurar o eliminar un tema o respuesta.

create table public.community_moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.community_moderators enable row level security;
alter table public.community_moderators force row level security;
revoke all on public.community_moderators from anon, authenticated;
grant select on public.community_moderators to authenticated;
create policy "ver_si_soy_moderador" on public.community_moderators for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.community_is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_moderators where user_id = auth.uid());
$$;

-- Cola: todo lo que tiene al menos un reporte y no está borrado, con motivos y si ya está oculto.
create or replace function public.community_moderation_queue()
returns table (
  kind text,
  id uuid,
  post_id uuid,
  title text,
  body text,
  author_alias text,
  created_at timestamptz,
  hidden boolean,
  reports bigint,
  reasons text[]
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.community_is_moderator() then
    raise exception 'Solo para moderadores';
  end if;
  return query
    select 'post'::text, p.id, p.id, p.title, p.body, pr.alias, p.created_at, p.hidden,
           count(r.id), array_agg(distinct r.reason)
      from public.community_posts p
      join public.community_reports r on r.target_kind = 'post' and r.target_id = p.id
      join public.community_profiles pr on pr.user_id = p.author_id
     where p.deleted_at is null
     group by p.id, pr.alias
    union all
    select 'reply'::text, c.id, c.post_id, null::text, c.body, pr.alias, c.created_at, c.hidden,
           count(r.id), array_agg(distinct r.reason)
      from public.community_replies c
      join public.community_reports r on r.target_kind = 'reply' and r.target_id = c.id
      join public.community_profiles pr on pr.user_id = c.author_id
     where c.deleted_at is null
     group by c.id, pr.alias
    order by 8 desc, 9 desc, 7 desc;
end $$;

-- Restaurar: vuelve a verse y se descartan sus reportes. Eliminar: borrado lógico.
create or replace function public.community_moderate(target_kind text, target_id uuid, action text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.community_is_moderator() then
    raise exception 'Solo para moderadores';
  end if;
  if target_kind not in ('post', 'reply') or action not in ('restore', 'remove') then
    raise exception 'Acción no válida';
  end if;
  if action = 'restore' then
    if target_kind = 'post' then
      update public.community_posts set hidden = false where id = target_id;
    else
      update public.community_replies set hidden = false where id = target_id;
    end if;
    delete from public.community_reports r where r.target_kind = community_moderate.target_kind and r.target_id = community_moderate.target_id;
  else
    if target_kind = 'post' then
      update public.community_posts set deleted_at = now(), updated_at = now() where id = target_id;
    else
      update public.community_replies set deleted_at = now(), updated_at = now() where id = target_id;
    end if;
  end if;
end $$;

revoke all on function public.community_moderation_queue() from public, anon;
revoke all on function public.community_moderate(text, uuid, text) from public, anon;
revoke all on function public.community_is_moderator() from public, anon;
grant execute on function public.community_moderation_queue() to authenticated;
grant execute on function public.community_moderate(text, uuid, text) to authenticated;
grant execute on function public.community_is_moderator() to authenticated;
