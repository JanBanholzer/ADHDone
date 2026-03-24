-- App calls Evangelizo HTTP API directly; saint bios are not stored in Postgres.
-- Safe if migration 0003 (evangelizo_*) was never applied.
drop table if exists public.evangelizo_saint cascade;
drop table if exists public.evangelizo_day cascade;
