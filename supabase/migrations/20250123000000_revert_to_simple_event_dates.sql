-- Change event_date from complex objects to simple string array
-- This reverts the event_date column to store only start times as strings

-- Update existing event_date data to extract start times only
UPDATE events 
SET event_date = (
  SELECT json_agg(date_obj->>'start')
  FROM json_array_elements(event_date) as date_obj
) 
WHERE event_date IS NOT NULL 
  AND jsonb_typeof(event_date) = 'array' 
  AND jsonb_array_length(event_date) > 0
  AND event_date->0 ? 'start';

-- For any events that still use the old start_date format, create event_date array
UPDATE events 
SET event_date = json_build_array(start_date)
WHERE event_date IS NULL AND start_date IS NOT NULL; 