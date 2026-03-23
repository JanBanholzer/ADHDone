-- Initial backend schema for ADHDone
-- Hierarchy: missions -> projects -> quests -> tasks

create extension if not exists pgcrypto;

-- Shared update trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Status enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'mission_status') then
    create type public.mission_status as enum ('active', 'accomplished', 'aborted');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('planned', 'active', 'completed', 'aborted');
  end if;

  if not exists (select 1 from pg_type where typname = 'quest_status') then
    create type public.quest_status as enum ('planned', 'active', 'completed', 'aborted');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('planned', 'done', 'skipped', 'aborted');
  end if;
end $$;

-- Missions: highest-level, long-lived entities
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  status public.mission_status not null default 'active',
  accomplished_at timestamptz,
  aborted_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status <> 'accomplished' or accomplished_at is not null)
    and (status <> 'aborted' or aborted_at is not null)
  )
);

-- Projects: medium-term elements serving missions
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
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

-- Quests: planned finite steps serving projects
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  status public.quest_status not null default 'planned',
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

-- Tasks: lowest level; must be assigned to a specific day
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests(id) on delete cascade,
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

-- Helpful indexes
create index if not exists idx_projects_mission_id on public.projects (mission_id);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_quests_project_id on public.quests (project_id);
create index if not exists idx_quests_status on public.quests (status);
create index if not exists idx_tasks_quest_id on public.tasks (quest_id);
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_tasks_status on public.tasks (status);

-- Updated-at triggers
drop trigger if exists trg_missions_set_updated_at on public.missions;
create trigger trg_missions_set_updated_at
before update on public.missions
for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_quests_set_updated_at on public.quests;
create trigger trg_quests_set_updated_at
before update on public.quests
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_set_updated_at on public.tasks;
create trigger trg_tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();
