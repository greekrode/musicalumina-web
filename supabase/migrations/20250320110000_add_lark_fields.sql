-- Add Lark fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS lark_base text,
ADD COLUMN IF NOT EXISTS lark_table text; 