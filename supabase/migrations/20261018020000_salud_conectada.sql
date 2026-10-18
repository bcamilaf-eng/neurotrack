-- NEUROTRACK · datos importados de Health Connect / Apple Salud
-- La calidad del sueño pasa a ser opcional (es una valoración personal que no se puede importar),
-- se anota el origen de sueño e hidratación y el registro del día suma la menstruación.

alter table public.sleep_records alter column quality drop not null;
alter table public.sleep_records
  add column source text not null default 'manual' check (source in ('manual', 'health_connect', 'healthkit'));
alter table public.hydration_records
  add column source text not null default 'manual' check (source in ('manual', 'health_connect', 'healthkit'));
alter table public.daily_records add column menstruation boolean;
