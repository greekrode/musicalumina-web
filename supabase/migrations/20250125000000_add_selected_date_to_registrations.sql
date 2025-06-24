-- Add selected_date column to registrations table
ALTER TABLE registrations 
ADD COLUMN selected_date DATE;

-- Add comment to the column
COMMENT ON COLUMN registrations.selected_date IS 'Selected date for masterclass registration from event_date options'; 