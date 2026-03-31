-- Hosted Supabase PostgREST only exposes configured schemas (default: public, graphql_public).
-- The separate `routines` schema caused "invalid schema: routines" from the mobile client.
-- Move routine tables + RPC into public so no dashboard change is required.

ALTER TABLE routines.routines SET SCHEMA public;

ALTER TABLE routines.routine_items SET SCHEMA public;

ALTER TABLE routines.routine_runs SET SCHEMA public;

DROP FUNCTION IF EXISTS routines.apply_routine_quest(uuid, date, text, text);

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
  'Creates a mission-only quest for p_target_date. Template tasks if ai_prompt empty; else OpenClaw fills tasks.';

GRANT EXECUTE ON FUNCTION public.apply_routine_quest(uuid, date, text, text) TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_runs TO anon, authenticated;

DROP SCHEMA routines CASCADE;

COMMENT ON TABLE public.routines IS
  'Recurring routine templates (formerly routines.routines). Generates mission-only quests.';
COMMENT ON TABLE public.routine_items IS 'Ordered steps for a routine template.';
COMMENT ON TABLE public.routine_runs IS 'History of routine applications.';
