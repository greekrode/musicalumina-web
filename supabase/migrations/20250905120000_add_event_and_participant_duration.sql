-- Add event_duration to events and duration to masterclass_participants
-- Safe to run multiple times

DO $$ BEGIN
  -- Add integer array of minutes to events
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'event_duration'
  ) THEN
    ALTER TABLE public.events
      ADD COLUMN event_duration integer[];
  END IF;

  -- Add integer duration (minutes) to masterclass_participants
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'masterclass_participants'
      AND column_name = 'duration'
  ) THEN
    ALTER TABLE public.masterclass_participants
      ADD COLUMN duration integer;
  END IF;
END $$;


