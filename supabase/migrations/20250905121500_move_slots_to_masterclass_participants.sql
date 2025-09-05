-- Move number_of_slots from registrations to masterclass_participants

DO $$ BEGIN
  -- Add column to masterclass_participants if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'masterclass_participants' AND column_name = 'number_of_slots'
  ) THEN
    ALTER TABLE public.masterclass_participants
      ADD COLUMN number_of_slots integer;
  END IF;

  -- Drop column from registrations if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'number_of_slots'
  ) THEN
    ALTER TABLE public.registrations
      DROP COLUMN number_of_slots;
  END IF;
END $$;


