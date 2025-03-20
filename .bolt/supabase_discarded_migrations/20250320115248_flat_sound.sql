/*
  # Add event winners table
  
  1. New Tables
    - event_winners: Store competition winners and their prizes
      - id (uuid, primary key)
      - event_id (uuid, foreign key to events)
      - category_id (uuid, foreign key to event_categories)
      - subcategory_id (uuid, foreign key to event_subcategories)
      - participant_name (text)
      - prize_title (text)
      - prize_amount (numeric)
      - created_at (timestamptz)
  
  2. Security
    - Enable RLS
    - Add public read access policy
*/

-- Create event winners table
CREATE TABLE IF NOT EXISTS event_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  category_id uuid REFERENCES event_categories(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES event_subcategories(id) ON DELETE CASCADE,
  participant_name text NOT NULL,
  prize_title text NOT NULL,
  prize_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_winners_event_id ON event_winners(event_id);
CREATE INDEX IF NOT EXISTS idx_event_winners_category_id ON event_winners(category_id);
CREATE INDEX IF NOT EXISTS idx_event_winners_subcategory_id ON event_winners(subcategory_id);

-- Enable RLS
ALTER TABLE event_winners ENABLE ROW LEVEL SECURITY;

-- Add policy for public read access
CREATE POLICY "Allow public read access on event winners"
  ON event_winners
  FOR SELECT
  TO public
  USING (true);