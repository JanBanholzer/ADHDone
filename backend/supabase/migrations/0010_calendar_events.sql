-- Calendar events synced from the mobile app's device calendar.
-- Full-replace sync: every sync cycle deletes the window and re-inserts the current snapshot.

CREATE TABLE public.calendar_events (
  id              text        PRIMARY KEY,
  title           text        NOT NULL,
  start_at        timestamptz NOT NULL,
  end_at          timestamptz NOT NULL,
  location        text        NOT NULL DEFAULT '',
  notes           text        NOT NULL DEFAULT '',
  calendar_name   text        NOT NULL DEFAULT '',
  is_all_day      boolean     NOT NULL DEFAULT false,
  source_platform text        NOT NULL DEFAULT '',
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_start_at ON public.calendar_events (start_at);
CREATE INDEX idx_calendar_events_end_at ON public.calendar_events (end_at);
CREATE INDEX idx_calendar_events_date_range ON public.calendar_events (start_at, end_at);

CREATE TRIGGER trg_calendar_events_set_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.calendar_events IS
  'Device calendar events synced from the mobile app. Full-replace window sync ensures deletions and edits are reflected.';
