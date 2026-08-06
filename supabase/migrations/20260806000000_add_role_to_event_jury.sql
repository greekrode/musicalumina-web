-- Add role column to event_jury to distinguish jury members from artists in residence.
-- Defaults to 'jury' so existing rows are unaffected.
ALTER TABLE event_jury
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'jury'
CHECK (role IN ('jury', 'artist_in_residence'));
