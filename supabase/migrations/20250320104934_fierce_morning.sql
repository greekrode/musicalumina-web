/* # Add event types AND registration system 1. Changes - Add registration status AND state enums - Update event status enum to include 'ongoing' - Add event type enum AND column - Add songs TABLE for festival repertoire - Add registrations TABLE
WITH related fields - Add storage buckets for documents 2. Security - Enable RLS
ON new tables - Add policies for public AND authenticated access */
--

CREATE registration status AND state enums

CREATE TYPE registration_status AS ENUM ('personal', 'parents', 'teacher');

CREATE TYPE registration_state AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE event_type AS ENUM ('festival', 'competition', 'masterclass');
-- Handle event status enum change

CREATE TEMPORARY TABLE temp_event_status AS
SELECT  id
       ,status::text AS old_status
FROM events;

ALTER TABLE events DROP COLUMN status;

DROP TYPE IF EXISTS event_status;
CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed');

ALTER TABLE events ADD COLUMN status event_status NOT NULL DEFAULT 'upcoming'; UPDATE events e

SET status = CASE WHEN t.old_status = 'upcoming' THEN 'upcoming'::event_status ELSE 'completed'::event_status END
FROM temp_event_status t
WHERE e.id = t.id;

DROP TABLE temp_event_status;
-- Add event type column

ALTER TABLE events ADD COLUMN type event_type NOT NULL DEFAULT 'competition';
--

CREATE songs table

CREATE TABLE IF NOT EXISTS songs ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, composer text, duration interval, difficulty_level text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
--

CREATE registrations table

CREATE TABLE IF NOT EXISTS registrations ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid REFERENCES events(id)
ON
DELETE CASCADE, subcategory_id uuid REFERENCES event_subcategories(id)
ON
DELETE CASCADE,
-- Registrant data
 registration_status registration_status NOT NULL, registrant_name text, registrant_whatsapp text NOT NULL, registrant_email text NOT NULL,
-- Participant data
 participant_name text NOT NULL, song_id uuid REFERENCES songs(id), song_title text, song_duration interval,
-- Document URLs (from storage)
 birth_certificate_url text NOT NULL, song_pdf_url text,
-- Payment info
 bank_name text NOT NULL, bank_account_number text NOT NULL, bank_account_name text NOT NULL, payment_receipt_url text NOT NULL, status registration_state NOT NULL DEFAULT 'pending', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
--

CREATE storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('registration-documents', 'registration-documents', false),
ON CONFLICT (id) DO NOTHING;
-- Enable RLS

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
-- Add policies

CREATE POLICY "Public can read songs"
ON songs FOR
SELECT  TO public USING (true);

CREATE POLICY "Authenticated users can read own registrations"
ON registrations FOR
SELECT  TO authenticated USING (auth.uid() IN ( SELECT auth.uid() FROM auth.users WHERE email = registrant_email ));

CREATE POLICY "Authenticated users can create registrations"
ON registrations FOR
INSERT TO authenticated
WITH CHECK
(true
);
-- Add storage policies

CREATE POLICY "Authenticated users can upload registration documents"
ON storage.objects FOR
INSERT TO authenticated
WITH CHECK
( bucket_id IN ('registration-documents')
);

CREATE POLICY "Users can read their own documents"
ON storage.objects FOR
SELECT  TO authenticated USING ( bucket_id IN ('registration-documents') AND (storage.foldername(name))[1] = auth.uid()::text );