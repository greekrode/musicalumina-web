/*
  # Update event categories and subcategories schema

  1. Changes
    - Move age_requirement and registration_fee from categories to subcategories
    - Update existing subcategories with default values
    - Create prizes table linked to subcategories

  2. Security
    - Enable RLS on prizes table
    - Add public read access policy (if not exists)
*/

-- First, add the new columns as nullable
ALTER TABLE event_subcategories
ADD COLUMN IF NOT EXISTS age_requirement text,
ADD COLUMN IF NOT EXISTS registration_fee numeric;

-- Update existing records with default values
UPDATE event_subcategories
SET 
  age_requirement = COALESCE(
    (SELECT age_requirement FROM event_categories WHERE event_categories.id = event_subcategories.category_id),
    'All ages'
  ),
  registration_fee = COALESCE(
    (SELECT registration_fee FROM event_categories WHERE event_categories.id = event_subcategories.category_id),
    0
  );

-- Now make the columns non-nullable
ALTER TABLE event_subcategories
ALTER COLUMN age_requirement SET NOT NULL,
ALTER COLUMN registration_fee SET NOT NULL;

-- Remove columns from event_categories
ALTER TABLE event_categories
DROP COLUMN IF EXISTS age_requirement,
DROP COLUMN IF EXISTS registration_fee;

-- Create event_prizes table with link to subcategories if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS event_prizes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    subcategory_id uuid REFERENCES event_subcategories(id) ON DELETE CASCADE,
    title text NOT NULL,
    amount numeric NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE event_prizes ENABLE ROW LEVEL SECURITY;

-- Add policy if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_prizes' 
    AND policyname = 'Allow public read access on event prizes'
  ) THEN
    CREATE POLICY "Allow public read access on event prizes"
    ON event_prizes
    FOR SELECT
    TO public
    USING (true);
  END IF;
END $$;