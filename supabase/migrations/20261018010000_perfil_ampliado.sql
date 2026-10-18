-- NEUROTRACK · perfil ampliado
-- Ocupación, diagnósticos de cefalea indicados por la persona y otras enfermedades.
-- Todo opcional; las políticas «solo_el_propietario» de profiles siguen aplicando.

alter table public.profiles
  add column occupation text check (char_length(occupation) <= 80),
  add column diagnoses text[] not null default '{}' check (
    diagnoses <@ array['migraine_without_aura', 'migraine_with_aura', 'chronic_migraine', 'menstrual_migraine',
      'tension', 'cluster', 'medication_overuse', 'not_diagnosed', 'other']::text[]
  ),
  add column other_conditions text check (char_length(other_conditions) <= 300),
  add column profile_prompted_at timestamptz;
