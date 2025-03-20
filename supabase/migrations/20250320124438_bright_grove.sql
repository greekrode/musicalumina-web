/*
  # Add order_index to event_subcategories

  1. Changes
    - Add order_index column to event_subcategories table
    - Update existing records with default order based on name
    - Make order_index non-nullable
  
  2. Notes
    - Default order is set based on existing subcategory names
    - Lower numbers appear first in the order
*/

-- Create a function to update order indexes
CREATE OR REPLACE FUNCTION update_subcategory_orders()
RETURNS void AS $$
DECLARE
  v_category_id uuid;
  v_current_order integer;
  v_subcategory_id uuid;
BEGIN
  FOR v_category_id IN SELECT DISTINCT category_id FROM event_subcategories
  LOOP
    v_current_order := 1;
    FOR v_subcategory_id IN 
      SELECT id 
      FROM event_subcategories 
      WHERE category_id = v_category_id 
      ORDER BY name
    LOOP
      UPDATE event_subcategories 
      SET order_index = v_current_order 
      WHERE id = v_subcategory_id;
      
      v_current_order := v_current_order + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'event_subcategories' 
    AND column_name = 'order_index'
  ) THEN
    -- Add order_index column as nullable first
    ALTER TABLE event_subcategories
    ADD COLUMN order_index integer;
  END IF;
END $$;

-- Update existing records
SELECT update_subcategory_orders();

-- Make the column non-nullable with a default value
ALTER TABLE event_subcategories
ALTER COLUMN order_index SET NOT NULL,
ALTER COLUMN order_index SET DEFAULT 999;

-- Clean up the function as it's no longer needed
DROP FUNCTION update_subcategory_orders();

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_subcategories_order 
ON event_subcategories(category_id, order_index);