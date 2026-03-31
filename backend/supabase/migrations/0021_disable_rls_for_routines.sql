-- Single-user setup: disable RLS on routines tables to avoid auth/policy friction.

ALTER TABLE IF EXISTS public.routines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.routine_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.routine_runs DISABLE ROW LEVEL SECURITY;

-- Keep broad access for API keys/roles used by app + OpenClaw.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_items TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_runs TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.apply_routine_quest(uuid, date, text, text) TO anon, authenticated, service_role;
