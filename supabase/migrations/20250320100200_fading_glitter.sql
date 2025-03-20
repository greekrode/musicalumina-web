/*
  # Events Management System Schema

  1. New Tables
    - `events`
      - Core event information (title, dates, location, etc.)
      - Status tracking
      - Terms and conditions
    - `event_categories`
      - Categories for each event (e.g., Group A, B, C)
      - Age requirements and fees
    - `event_subcategories`
      - Subcategories within each category
      - Specific requirements and repertoire
    - `event_jury`
      - Jury members for each event
      - Professional details and credentials
    - `event_prizes`
      - Prize information for each event category
      - Award amounts and descriptions

  2. Security
    - Enable RLS on all tables
    - Public read access for event data
    - Admin-only write access
*/

-- Create custom types
CREATE TYPE event_status AS ENUM ('upcoming', 'completed');

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  overview text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  registration_deadline timestamptz,
  location text NOT NULL,
  venue_details text,
  status event_status NOT NULL DEFAULT 'upcoming',
  terms_and_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event categories table
CREATE TABLE IF NOT EXISTS event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  age_requirement text NOT NULL,
  registration_fee numeric NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create event subcategories table
CREATE TABLE IF NOT EXISTS event_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES event_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  repertoire jsonb NOT NULL DEFAULT '[]'::jsonb,
  performance_duration text,
  requirements text,
  created_at timestamptz DEFAULT now()
);

-- Create event jury table
CREATE TABLE IF NOT EXISTS event_jury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL,
  description text,
  avatar_url text,
  credentials jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create event prizes table
CREATE TABLE IF NOT EXISTS event_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  category_id uuid REFERENCES event_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_jury ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_prizes ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on events"
  ON events FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access on event categories"
  ON event_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access on event subcategories"
  ON event_subcategories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access on event jury"
  ON event_jury FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access on event prizes"
  ON event_prizes FOR SELECT
  TO public
  USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to events table
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();