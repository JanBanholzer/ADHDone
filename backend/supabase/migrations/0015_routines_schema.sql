-- Routines schema: reusable templates that expand into errands for a given day.
-- Kept in a separate schema to avoid cluttering public domain tables.

create schema if not exists routines;

-- Routine headers
create table if not exists routines.routines (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_routines_enabled on routines.routines (enabled);
create index if not exists idx_routines_sort_order on routines.routines (sort_order);

drop trigger if exists trg_routines_set_updated_at on routines.routines;
create trigger trg_routines_set_updated_at
before update on routines.routines
for each row execute function public.set_updated_at();

-- Routine items (steps) that become errands when applied.
create table if not exists routines.routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines.routines(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  notes text not null default '',
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_routine_items_routine_id on routines.routine_items (routine_id);
create index if not exists idx_routine_items_sort_order on routines.routine_items (routine_id, sort_order);

drop trigger if exists trg_routine_items_set_updated_at on routines.routine_items;
create trigger trg_routine_items_set_updated_at
before update on routines.routine_items
for each row execute function public.set_updated_at();

comment on schema routines is 'Routine templates that can be applied to create daily errands.';
comment on table routines.routines is 'A named routine (template) made up of ordered routine_items.';
comment on table routines.routine_items is 'A step in a routine. When a routine is applied, each step is inserted as an errand.';

-- Track which errands came from which routine item (optional).
alter table public.errands
  add column if not exists routine_item_id uuid references routines.routine_items(id) on delete set null;

-- Prevent accidentally applying the same routine step twice for the same day.
create unique index if not exists idx_errands_unique_routine_item_per_day
  on public.errands (due_date, routine_item_id);

-- RPC: expand a routine into errands for a date (idempotent).
create or replace function routines.apply_routine(p_routine_id uuid, p_due_date date)
returns integer
language plpgsql
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.errands (title, notes, due_date, estimate_minutes, sort_order, routine_item_id)
  select
    ri.title,
    ri.notes,
    p_due_date,
    ri.estimate_minutes,
    ri.sort_order,
    ri.id
  from routines.routine_items ri
  join routines.routines r on r.id = ri.routine_id
  where ri.routine_id = p_routine_id
    and r.enabled = true
  order by ri.sort_order, ri.created_at
  on conflict (due_date, routine_item_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

comment on function routines.apply_routine(uuid, date) is
  'Expands the routine into errands for the given due_date. Returns how many new errands were inserted. Idempotent per (due_date, routine_item_id).';

-- Grants: allow mobile app (anon/authenticated) to use routines schema.
-- Note: Supabase PostgREST must expose the 'routines' schema as well.
grant usage on schema routines to anon, authenticated;
grant select, insert, update, delete on routines.routines to anon, authenticated;
grant select, insert, update, delete on routines.routine_items to anon, authenticated;
grant execute on function routines.apply_routine(uuid, date) to anon, authenticated;

