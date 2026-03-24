-- Add optional description to remaining actionable elements.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

ALTER TABLE public.errands
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.tasks.description IS
  'Optional user-facing description for task context.';

COMMENT ON COLUMN public.errands.description IS
  'Optional user-facing description for errand context.';

COMMENT ON COLUMN public.reminders.description IS
  'Optional user-facing description for reminder context.';
