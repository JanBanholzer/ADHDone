-- Allow routines to create either quests or direct mission tasks.

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS apply_as text NOT NULL DEFAULT 'quest'
  CHECK (apply_as IN ('quest', 'task'));

COMMENT ON COLUMN public.routines.apply_as IS
  'How this routine is applied: quest (default) creates a quest; task creates mission tasks directly.';

CREATE OR REPLACE FUNCTION public.apply_routine_quest(
  p_routine_id        uuid,
  p_target_date       date,
  p_quest_title       text DEFAULT NULL,
  p_quest_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_routine     public.routines%ROWTYPE;
  v_quest_id    uuid;
  v_quest_title text;
  v_quest_desc  text;
BEGIN
  SELECT * INTO v_routine FROM public.routines WHERE id = p_routine_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Routine % not found', p_routine_id;
  END IF;
  IF NOT v_routine.enabled THEN
    RAISE EXCEPTION 'Routine "%" is disabled', v_routine.title;
  END IF;
  IF v_routine.target_mission_id IS NULL THEN
    RAISE EXCEPTION 'Routine "%" has no target mission — set one before applying', v_routine.title;
  END IF;

  -- Task mode: create direct mission tasks and no quest row.
  IF v_routine.apply_as = 'task' THEN
    INSERT INTO public.tasks (quest_id, mission_id, title, notes, due_date, estimate_minutes, sort_order)
    SELECT NULL, v_routine.target_mission_id, ri.title, ri.notes, p_target_date, ri.estimate_minutes, ri.sort_order
    FROM   public.routine_items ri
    WHERE  ri.routine_id = p_routine_id
    ORDER  BY ri.sort_order, ri.created_at;

    INSERT INTO public.routine_runs (routine_id, quest_id, target_date, ai_generated, notes)
    VALUES (p_routine_id, NULL, p_target_date, false, 'applied_as_task');

    RETURN NULL;
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
    FROM   public.routine_items ri
    WHERE  ri.routine_id = p_routine_id
    ORDER  BY ri.sort_order, ri.created_at;
  END IF;

  INSERT INTO public.routine_runs (routine_id, quest_id, target_date, ai_generated)
  VALUES (p_routine_id, v_quest_id, p_target_date, v_routine.ai_prompt <> '');

  RETURN v_quest_id;
END;
$$;

COMMENT ON FUNCTION public.apply_routine_quest(uuid, date, text, text) IS
  'Applies a routine for p_target_date. apply_as=quest creates a quest (and tasks if ai_prompt empty). apply_as=task creates direct mission tasks.';
