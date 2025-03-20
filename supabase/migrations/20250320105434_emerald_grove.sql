/*
  # Database Schema Update

  1. New Types
    - registration_status enum ('personal', 'parents', 'teacher')
    - registration_state enum ('pending', 'approved', 'rejected')
    - event_type enum ('festival', 'competition', 'masterclass')
    - event_status enum ('upcoming', 'ongoing', 'completed')

  2. New Tables
    - songs: For storing song information
    - registrations: For event registrations

  3. Storage
    - Added buckets for registration documents and payment receipts
    - Added RLS policies for secure access
*/

-- Step 1: Drop existing types to avoid conflicts
DROP TYPE IF EXISTS registration_status CASCADE;
DROP TYPE IF EXISTS registration_state CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;

-- Step 2: Create enum types
CREATE TYPE registration_status AS ENUM ('personal', 'parents', 'teacher');
CREATE TYPE registration_state AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE event_type AS ENUM ('festival', 'competition', 'masterclass');
CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed');

-- Step 3: Update events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS type event_type NOT NULL DEFAULT 'competition',
ADD COLUMN IF NOT EXISTS status event_status NOT NULL DEFAULT 'upcoming';

-- Step 4: Create songs table
CREATE TABLE IF NOT EXISTS songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  composer text,
  duration interval,
  difficulty_level text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 5: Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES event_subcategories(id) ON DELETE CASCADE,
  
  -- Registrant data
  registration_status registration_status NOT NULL,
  registrant_name text,
  registrant_whatsapp text NOT NULL,
  registrant_email text NOT NULL,
  
  -- Participant data
  participant_name text NOT NULL,
  song_id uuid REFERENCES songs(id),
  song_title text,
  song_duration interval,
  
  -- Document URLs
  birth_certificate_url text NOT NULL,
  song_pdf_url text,
  
  -- Payment info
  bank_name text NOT NULL,
  bank_account_number text NOT NULL,
  bank_account_name text NOT NULL,
  payment_receipt_url text NOT NULL,
  
  -- Metadata
  status registration_state NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 6: Set up storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('registration-documents', 'registration-documents', false),
  ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Step 7: Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Step 8: Clean up existing policies
DROP POLICY IF EXISTS "Public can read songs" ON songs;
DROP POLICY IF EXISTS "Authenticated users can read own registrations" ON registrations;
DROP POLICY IF EXISTS "Authenticated users can create registrations" ON registrations;
DROP POLICY IF EXISTS "Authenticated users can upload registration documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;

-- Step 9: Create policies
-- Songs policies
CREATE POLICY "Public can read songs"
  ON songs
  FOR SELECT
  TO public
  USING (true);

-- Registration policies
CREATE POLICY "Authenticated users can read own registrations"
  ON registrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT auth.uid()
    FROM auth.users
    WHERE email = registrant_email
  ));

CREATE POLICY "Authenticated users can create registrations"
  ON registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Storage policies
CREATE POLICY "Authenticated users can upload registration documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('registration-documents', 'payment-receipts')
  );

CREATE POLICY "Users can read their own documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('registration-documents', 'payment-receipts')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );