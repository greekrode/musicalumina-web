/*
  # Update event prizes schema
  
  1. Changes
    - Make category_id nullable to allow prizes that apply to all categories
    - Make amount nullable for non-monetary prizes
    - Add index on event_id for better query performance
  
  2. Security
    - Maintain existing RLS policies
*/

-- Make category_id and amount nullable
ALTER TABLE event_prizes
ALTER COLUMN category_id DROP NOT NULL,
ALTER COLUMN amount DROP NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_prizes_event_id 
ON event_prizes(event_id);

-- Add comment to explain nullable fields
COMMENT ON COLUMN event_prizes.category_id IS 'Optional. When null, the prize applies to all categories';
COMMENT ON COLUMN event_prizes.amount IS 'Optional. For non-monetary prizes';