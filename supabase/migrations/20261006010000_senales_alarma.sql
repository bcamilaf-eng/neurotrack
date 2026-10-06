-- Hito 5: preguntas del motor de señales de alarma (ver src/domain/alerts/rules.ts).
alter table public.headache_episodes
  add column sudden_onset boolean,
  add column head_trauma boolean;

create index alarm_flags_user_detected on public.alarm_flags (user_id, detected_at);
