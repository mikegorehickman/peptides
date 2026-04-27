-- ============================================================================
-- PEPTIDE TRACKER — SCHEMA
-- ALREADY APPLIED to project llfthegtjaexlyuywize as migration peptide_tracker_init
-- This file is kept for reference only.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------- TABLES ----------
create table if not exists public.pep_peptides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mg numeric not null check (mg > 0),
  ml numeric not null check (ml > 0),
  mcg_per_unit numeric generated always as ((mg * 10) / ml) stored,
  created_at timestamptz not null default now()
);

create index if not exists pep_peptides_user_idx on public.pep_peptides(user_id);

create table if not exists public.pep_doses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  peptide_id uuid not null references public.pep_peptides(id) on delete cascade,
  peptide_name text not null,
  date date not null,
  time_of_day text not null check (time_of_day in ('AM', 'PM')),
  units numeric not null check (units > 0),
  mcg numeric not null check (mcg > 0),
  created_at timestamptz not null default now()
);

create index if not exists pep_doses_user_date_idx on public.pep_doses(user_id, date desc);
create index if not exists pep_doses_peptide_idx on public.pep_doses(peptide_id);

-- ---------- RLS ----------
alter table public.pep_peptides enable row level security;
alter table public.pep_doses enable row level security;

drop policy if exists "pep read own peptides" on public.pep_peptides;
create policy "pep read own peptides" on public.pep_peptides
  for select using (auth.uid() = user_id);

drop policy if exists "pep read own doses" on public.pep_doses;
create policy "pep read own doses" on public.pep_doses
  for select using (auth.uid() = user_id);

-- All writes go through SECURITY DEFINER RPCs below

-- ---------- RPCs ----------
create or replace function public.pep_insert_peptide(
  p_name text,
  p_mg numeric,
  p_ml numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  insert into public.pep_peptides (user_id, name, mg, ml)
  values (v_user_id, p_name, p_mg, p_ml)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.pep_insert_peptide(text, numeric, numeric) to authenticated;

create or replace function public.pep_delete_peptide(p_peptide_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  delete from public.pep_peptides where id = p_peptide_id and user_id = v_user_id;
end;
$$;

grant execute on function public.pep_delete_peptide(uuid) to authenticated;

create or replace function public.pep_insert_dose(
  p_peptide_id uuid,
  p_date date,
  p_time_of_day text,
  p_units numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_peptide public.pep_peptides%rowtype;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_peptide
  from public.pep_peptides
  where id = p_peptide_id and user_id = v_user_id;

  if not found then
    raise exception 'peptide not found';
  end if;

  insert into public.pep_doses (user_id, peptide_id, peptide_name, date, time_of_day, units, mcg)
  values (
    v_user_id,
    v_peptide.id,
    v_peptide.name,
    p_date,
    p_time_of_day,
    p_units,
    p_units * v_peptide.mcg_per_unit
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.pep_insert_dose(uuid, date, text, numeric) to authenticated;

create or replace function public.pep_delete_dose(p_dose_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  delete from public.pep_doses where id = p_dose_id and user_id = v_user_id;
end;
$$;

grant execute on function public.pep_delete_dose(uuid) to authenticated;
