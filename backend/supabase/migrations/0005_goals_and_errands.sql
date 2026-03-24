-- Independent planning entities:
-- goals: like projects, but not attached to missions.
-- errands: like tasks, but not attached to quests/projects/missions.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  status public.project_status not null default 'planned',
  target_date date,
  completed_at timestamptz,
  aborted_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status <> 'completed' or completed_at is not null)
    and (status <> 'aborted' or aborted_at is not null)
  )
);

create table if not exists public.errands (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  notes text not null default '',
  status public.task_status not null default 'planned',
  due_date date not null,
  done_at timestamptz,
  skipped_at timestamptz,
  aborted_at timestamptz,
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status <> 'done' or done_at is not null)
    and (status <> 'skipped' or skipped_at is not null)
    and (status <> 'aborted' or aborted_at is not null)
  )
);

create index if not exists idx_goals_status on public.goals (status);
create index if not exists idx_goals_target_date on public.goals (target_date);
create index if not exists idx_errands_status on public.errands (status);
create index if not exists idx_errands_due_date on public.errands (due_date);

drop trigger if exists trg_goals_set_updated_at on public.goals;
create trigger trg_goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists trg_errands_set_updated_at on public.errands;
create trigger trg_errands_set_updated_at
before update on public.errands
for each row execute function public.set_updated_at();
