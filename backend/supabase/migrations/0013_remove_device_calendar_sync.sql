-- Remove device calendar sync storage.
-- Church/liturgical calendar data remains in liturgical_* tables.

DROP TABLE IF EXISTS public.calendar_events;
