-- NEUROTRACK · esquema inicial en Supabase (PostgreSQL)
--
-- Refleja el esquema local (src/data/db/migrations.ts) para la sincronización.
-- Seguridad:
--   * Row Level Security en TODAS las tablas: cada usuario solo lee y escribe sus filas.
--   * Restricciones CHECK que repiten las validaciones de la app (defensa en profundidad).
--   * Sin acceso para el rol anónimo.
-- Proyecto recomendado en región UE (datos de salud, RGPD art. 9).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  birth_date date check (birth_date <= current_date),
  sex text check (sex in ('female', 'male', 'other', 'undisclosed')),
  weight_kg numeric(5, 1) check (weight_kg between 20 and 300),
  height_cm numeric(5, 1) check (height_cm between 50 and 250),
  country text,
  tracking_notes text check (char_length(tracking_notes) <= 1000),
  pregnant_or_postpartum boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  text_scale numeric(3, 2) not null default 1 check (text_scale between 0.8 and 1.6),
  biometric_lock boolean not null default false,
  lock_after_minutes int not null default 5 check (lock_after_minutes between 0 and 60),
  reminders jsonb not null default '{}'::jsonb,
  language text not null default 'es',
  updated_at timestamptz not null default now()
);

-- Columnas comunes de las tablas clínicas (ids generados en el dispositivo).
create table public.emergency_contacts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (phone ~ '^\+?[0-9 ()-]{6,20}$'),
  relationship text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table public.consents (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('terms', 'health_data', 'cloud_sync', 'pattern_analysis')),
  version text not null,
  accepted boolean not null,
  decided_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index consents_user_type on public.consents (user_id, type, decided_at);

create table public.headache_episodes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  ongoing boolean not null default false,
  duration_min int check (duration_min is null or duration_min between 1 and 10080),
  type text not null check (type in ('migraine', 'tension', 'cluster', 'jaqueca', 'unspecified', 'other')),
  type_other text,
  intensity smallint not null check (intensity between 0 and 10),
  max_intensity smallint not null check (max_intensity between 0 and 10),
  locations text[] not null default '{}',
  location_other text,
  qualities text[] not null default '{}',
  quality_other text,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  check (ended_at is null or ended_at > started_at),
  check ((ongoing and ended_at is null) or (not ongoing and ended_at is not null))
);
create index episodes_user_date on public.headache_episodes (user_id, date);

create table public.episode_events (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references public.headache_episodes (id) on delete cascade,
  at timestamptz not null,
  kind text not null check (kind in ('pain', 'medication', 'note')),
  intensity smallint check (intensity is null or intensity between 0 and 10),
  medication_id uuid,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index events_episode on public.episode_events (episode_id, at);

create table public.symptoms (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references public.headache_episodes (id) on delete cascade,
  type text not null,
  intensity smallint check (intensity is null or intensity between 0 and 10),
  duration_min int check (duration_min is null or duration_min >= 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index symptoms_episode on public.symptoms (episode_id);

create table public.aura_details (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references public.headache_episodes (id) on delete cascade,
  types text[] not null default '{}',
  duration_min int check (duration_min is null or duration_min >= 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create unique index aura_episode on public.aura_details (episode_id) where deleted_at is null;

create table public.triggers (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references public.headache_episodes (id) on delete cascade,
  type text not null,
  detail text check (char_length(detail) <= 120),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index triggers_episode on public.triggers (episode_id);

create table public.medications (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid references public.headache_episodes (id) on delete set null,
  date date not null,
  taken_at timestamptz not null,
  name text not null check (char_length(name) between 1 and 100),
  dose_value numeric(10, 3) not null check (dose_value > 0 and dose_value <= 10000),
  dose_unit text not null,
  reason text,
  prescribed_by_professional boolean not null default false,
  response text check (response is null or response in ('none', 'partial', 'complete')),
  minutes_to_relief int check (minutes_to_relief is null or minutes_to_relief between 0 and 1440),
  adverse_effects text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index medications_user_date on public.medications (user_id, date);

create table public.sleep_records (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  bedtime_at timestamptz not null,
  wake_at timestamptz not null check (wake_at > bedtime_at),
  hours numeric(4, 1) not null check (hours > 0 and hours <= 24),
  quality smallint not null check (quality between 1 and 5),
  awakenings smallint not null default 0 check (awakenings >= 0),
  insomnia boolean not null default false,
  restorative boolean,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create unique index sleep_user_date on public.sleep_records (user_id, date) where deleted_at is null;

create table public.hydration_records (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  amount_ml int not null check (amount_ml between 0 and 10000),
  glasses smallint check (glasses is null or glasses between 0 and 40),
  perceived smallint check (perceived is null or perceived between 1 and 5),
  goal_ml int not null default 2000,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create unique index hydration_user_date on public.hydration_records (user_id, date) where deleted_at is null;

create table public.meal_records (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meal_type text not null,
  time time,
  foods text[] not null default '{}',
  fasting boolean not null default false,
  fasting_hours numeric(4, 1),
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index meals_user_date on public.meal_records (user_id, date);

create table public.daily_records (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  stress smallint check (stress is null or stress between 1 and 10),
  anxiety smallint check (anxiety is null or anxiety between 1 and 10),
  mood smallint check (mood is null or mood between 1 and 5),
  workload smallint check (workload is null or workload between 1 and 5),
  stressful_situations text,
  pain_free boolean not null default false,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create unique index daily_user_date on public.daily_records (user_id, date) where deleted_at is null;

create table public.alarm_flags (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references public.headache_episodes (id) on delete cascade,
  signal text not null,
  rules_version text not null,
  detected_at timestamptz not null,
  shown_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

-- ── Row Level Security ────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'emergency_contacts', 'consents', 'headache_episodes', 'episode_events', 'symptoms',
    'aura_details', 'triggers', 'medications', 'sleep_records', 'hydration_records',
    'meal_records', 'daily_records', 'alarm_flags', 'user_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy "solo_el_propietario" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create policy "solo_el_propietario" on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke all on public.profiles from anon;

-- Un hijo no puede apuntar a un episodio de otro usuario.
create or replace function public.assert_same_owner() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.episode_id is not null and not exists (
    select 1 from public.headache_episodes e where e.id = new.episode_id and e.user_id = new.user_id
  ) then
    raise exception 'El episodio no pertenece al usuario';
  end if;
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['episode_events', 'symptoms', 'aura_details', 'triggers', 'medications', 'alarm_flags']
  loop
    execute format(
      'create trigger same_owner before insert or update on public.%I
         for each row execute function public.assert_same_owner()', t);
  end loop;
end $$;

-- Perfil y ajustes vacíos al crear la cuenta (sin datos personales).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
