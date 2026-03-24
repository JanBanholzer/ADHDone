-- Reminders: standalone time-based alerts with optional recurrence.

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  remind_at timestamptz not null,
  recurring_interval_days integer check (recurring_interval_days is null or recurring_interval_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reminders_remind_at on public.reminders (remind_at);

drop trigger if exists trg_reminders_set_updated_at on public.reminders;
create trigger trg_reminders_set_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();
