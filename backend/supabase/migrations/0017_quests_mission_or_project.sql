-- Quests: each row attaches to exactly one of project OR mission (not both).
-- Routines: generated quests attach to a mission only (no project row).

-- ── public.quests ───────────────────────────────────────────────────────────
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE;

ALTER TABLE public.quests
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.quests
  DROP CONSTRAINT IF EXISTS chk_quests_project_or_mission;

ALTER TABLE public.quests
  ADD CONSTRAINT chk_quests_project_or_mission CHECK (
    (project_id IS NOT NULL AND mission_id IS NULL)
    OR (project_id IS NULL AND mission_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_quests_mission_id ON public.quests (mission_id);

COMMENT ON COLUMN public.quests.mission_id IS
  'Direct mission link when the quest has no project. XOR with project_id.';

-- ── routines: mission target only (migrate from legacy target_project_id) ───
ALTER TABLE routines.routines
  ADD COLUMN IF NOT EXISTS target_mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL;

UPDATE routines.routines r
SET target_mission_id = p.mission_id
FROM public.projects p
WHERE r.target_project_id IS NOT NULL
  AND r.target_project_id = p.id;

ALTER TABLE routines.routines DROP COLUMN IF EXISTS target_project_id;

COMMENT ON COLUMN routines.routines.target_mission_id IS
  'Mission for generated quests (mission-only; does not appear under any project).';

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
  IF v_routine.target_mission_id IS NULL THEN
    RAISE EXCEPTION 'Routine "%" has no target mission — set one before applying', v_routine.title;
  END IF;

  v_quest_title :=
    COALESCE(NULLIF(p_quest_title, ''), NULLIF(v_routine.quest_title_template, ''), v_routine.title);
  v_quest_desc :=
    COALESCE(NULLIF(p_quest_description, ''), v_routine.quest_description_template, '');

  INSERT INTO public.quests (project_id, mission_id, title, description, status, target_date)
  VALUES (NULL, v_routine.target_mission_id, v_quest_title, v_quest_desc, 'planned', p_target_date)
  RETURNING id INTO v_quest_id;

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
  'Creates a mission-only quest for p_target_date. Template tasks if ai_prompt empty; else OpenClaw fills tasks.';
