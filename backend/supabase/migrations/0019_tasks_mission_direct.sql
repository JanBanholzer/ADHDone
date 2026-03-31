-- Tasks: each row attaches to exactly one of quest OR mission (not both).
-- Mirrors the quest → project|mission XOR pattern from migration 0017.

-- ── public.tasks ─────────────────────────────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  ALTER COLUMN quest_id DROP NOT NULL;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS chk_tasks_quest_or_mission;

ALTER TABLE public.tasks
  ADD CONSTRAINT chk_tasks_quest_or_mission CHECK (
    (quest_id IS NOT NULL AND mission_id IS NULL)
    OR (quest_id IS NULL AND mission_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_tasks_mission_id ON public.tasks (mission_id);

COMMENT ON COLUMN public.tasks.mission_id IS
  'Direct mission link when the task has no quest. XOR with quest_id.';
