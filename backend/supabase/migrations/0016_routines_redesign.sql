-- 0016: Redesign routines as quest-generating recurring triggers.
-- Routines are templates that create quests (with tasks) on a schedule.
-- Two modes:
--   Template-based: routine_items define fixed tasks → inserted immediately.
--   AI-assisted:    ai_prompt is non-empty → OpenClaw generates tasks after quest creation.

-- ── Undo errand-centric approach from 0015 ──────────────────────────────────
DROP FUNCTION IF EXISTS routines.apply_routine(uuid, date);
DROP INDEX IF EXISTS idx_errands_unique_routine_item_per_day;
ALTER TABLE public.errands DROP COLUMN IF EXISTS routine_item_id;

-- ── Extend routines.routines ─────────────────────────────────────────────────
ALTER TABLE routines.routines
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'manual'
    CHECK (schedule_type IN ('manual', 'weekly', 'monthly', 'quarterly', 'yearly')),
  ADD COLUMN IF NOT EXISTS schedule_anchor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quest_title_template text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quest_description_template text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_prompt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_project_id uuid
    REFERENCES public.projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN routines.routines.schedule_type IS
  'How often the routine recurs: manual (on-demand only), weekly, monthly, quarterly, yearly.';
COMMENT ON COLUMN routines.routines.schedule_anchor IS
  'Human-readable trigger window, e.g. "last week of month", "2 weeks before end of quarter". '
  'OpenClaw reads this to decide whether to fire the routine during the daily briefing.';
COMMENT ON COLUMN routines.routines.quest_title_template IS
  'Title for the generated quest. Supports placeholders: {month}, {year}, {quarter}. '
  'Falls back to the routine title if empty.';
COMMENT ON COLUMN routines.routines.quest_description_template IS
  'Description for the generated quest. Placeholders supported as above.';
COMMENT ON COLUMN routines.routines.ai_prompt IS
  'If non-empty: OpenClaw uses this after quest creation to generate tasks via AI '
  '(e.g. look up official due dates, required forms, etc.). '
  'If empty: routine_items are used as fixed task templates instead.';
COMMENT ON COLUMN routines.routines.target_project_id IS
  'The project the generated quest is attached to. Must be set before applying.';

-- ── Routine run history ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routines.routine_runs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id   uuid        NOT NULL REFERENCES routines.routines(id) ON DELETE CASCADE,
  quest_id     uuid        REFERENCES public.quests(id) ON DELETE SET NULL,
  target_date  date        NOT NULL,
  applied_at   timestamptz NOT NULL DEFAULT now(),
  ai_generated boolean     NOT NULL DEFAULT false,
  notes        text        NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_routine_runs_routine_id
  ON routines.routine_runs (routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_runs_target_date
  ON routines.routine_runs (target_date DESC);

COMMENT ON TABLE routines.routine_runs IS
  'One row per application of a routine. '
  'OpenClaw checks this table to avoid double-firing within the same period.';

-- ── RPC: apply a routine — creates a quest (and optionally tasks) ────────────
CREATE OR REPLACE FUNCTION routines.apply_routine_quest(
  p_routine_id        uuid,
  p_target_date       date,
  p_quest_title       text DEFAULT NULL,
  p_quest_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_routine     routines.routines%ROWTYPE;
  v_quest_id    uuid;
  v_quest_title text;
  v_quest_desc  text;
BEGIN
  SELECT * INTO v_routine FROM routines.routines WHERE id = p_routine_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Routine % not found', p_routine_id;
  END IF;
  IF NOT v_routine.enabled THEN
    RAISE EXCEPTION 'Routine "%" is disabled', v_routine.title;
  END IF;
  IF v_routine.target_project_id IS NULL THEN
    RAISE EXCEPTION 'Routine "%" has no target project — set one before applying', v_routine.title;
  END IF;

  v_quest_title :=
    COALESCE(NULLIF(p_quest_title, ''), NULLIF(v_routine.quest_title_template, ''), v_routine.title);
  v_quest_desc :=
    COALESCE(NULLIF(p_quest_description, ''), v_routine.quest_description_template, '');

  INSERT INTO public.quests (project_id, title, description, status, target_date)
  VALUES (v_routine.target_project_id, v_quest_title, v_quest_desc, 'planned', p_target_date)
  RETURNING id INTO v_quest_id;

  -- Template-based: insert fixed tasks from routine_items immediately.
  -- AI-assisted: quest is left empty for OpenClaw to populate via ai_prompt.
  IF v_routine.ai_prompt = '' THEN
    INSERT INTO public.tasks (quest_id, title, notes, due_date, estimate_minutes, sort_order)
    SELECT v_quest_id, ri.title, ri.notes, p_target_date, ri.estimate_minutes, ri.sort_order
    FROM   routines.routine_items ri
    WHERE  ri.routine_id = p_routine_id
    ORDER  BY ri.sort_order, ri.created_at;
  END IF;

  INSERT INTO routines.routine_runs (routine_id, quest_id, target_date, ai_generated)
  VALUES (p_routine_id, v_quest_id, p_target_date, v_routine.ai_prompt <> '');

  RETURN v_quest_id;
END;
$$;

COMMENT ON FUNCTION routines.apply_routine_quest(uuid, date, text, text) IS
  'Creates a quest for p_target_date from the routine template. '
  'If ai_prompt is empty: also inserts tasks from routine_items. '
  'If ai_prompt is set: creates the quest only — OpenClaw reads the prompt and generates tasks. '
  'Records the run in routine_runs. Returns the new quest id.';

GRANT SELECT, INSERT, UPDATE, DELETE ON routines.routine_runs TO anon, authenticated;
GRANT EXECUTE ON FUNCTION routines.apply_routine_quest(uuid, date, text, text) TO anon, authenticated;
