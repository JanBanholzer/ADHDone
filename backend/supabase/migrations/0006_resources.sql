-- Persistent user memory/resources for long-term AI assistance (RAG-style retrieval).
-- These are standalone knowledge objects, not tied to mission/project/quest/task.

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  content text not null check (length(trim(content)) > 0),
  summary text not null default '',
  source text not null default '',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  is_archived boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '')
    )
  ) stored
);

create index if not exists idx_resources_archived on public.resources (is_archived);
create index if not exists idx_resources_last_used_at on public.resources (last_used_at);
create index if not exists idx_resources_tags_gin on public.resources using gin (tags);
create index if not exists idx_resources_metadata_gin on public.resources using gin (metadata);
create index if not exists idx_resources_search_tsv on public.resources using gin (search_tsv);

drop trigger if exists trg_resources_set_updated_at on public.resources;
create trigger trg_resources_set_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

comment on table public.resources is
  'Long-term user memory objects for retrieval-augmented assistance (RAG).';
comment on column public.resources.metadata is
  'Flexible structured context (e.g., priority, topic, confidence, external refs).';
comment on column public.resources.search_tsv is
  'Full-text search index vector over title + summary + content.';
