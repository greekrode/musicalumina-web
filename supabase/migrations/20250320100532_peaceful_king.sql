/*
  # Seed Events Data

  This migration adds sample event data including:
  1. Events
    - Lumina Signature Piano Festival 2025
  2. Categories
    - Group A (6 years & below)
    - Classical Solo and Contemporary Solo subcategories
  3. Jury Members
    - Dr. Maria Chen
    - Prof. Hans Mueller
  4. Prizes
    - Elementary Level prizes
*/

-- Insert sample event
DO $$ 
DECLARE
  event_id uuid;
  category_id uuid;
BEGIN
  -- Insert event
  INSERT INTO events (
    title,
    overview,
    description,
    start_date,
    end_date,
    registration_deadline,
    location,
    venue_details,
    status,
    terms_and_conditions
  ) VALUES (
    'Lumina Signature Piano Festival 2025',
    'The inaugural Lumina Signature Piano Festival brings together emerging pianists in a celebration of musical excellence.',
    'Join us for an extraordinary celebration of piano music featuring talented young musicians.',
    '2025-08-09 09:00:00+00',
    '2025-08-09 18:00:00+00',
    '2025-07-07 23:59:59+00',
    'Jakarta Design Center',
    'Main Auditorium',
    'upcoming',
    '{
      "registration": {
        "eligibility": "Participants must meet age requirements",
        "documents": "Age verification required"
      },
      "performance": {
        "guidelines": [
          "All performances must be memorized",
          "Strict adherence to time limits",
          "Original sheet music required"
        ]
      },
      "rules": [
        "Performance order determined by organizer",
        "30-minute early arrival required",
        "Jury decisions are final"
      ]
    }'
  ) RETURNING id INTO event_id;

  -- Insert category
  INSERT INTO event_categories (
    event_id,
    name,
    age_requirement,
    registration_fee,
    description
  ) VALUES (
    event_id,
    'Group A',
    '6 years & below',
    688000,
    'Entry level category for young pianists'
  ) RETURNING id INTO category_id;

  -- Insert subcategories
  INSERT INTO event_subcategories (
    category_id,
    name,
    repertoire,
    performance_duration,
    requirements
  ) VALUES
  (
    category_id,
    'Classical Solo',
    '["One piece from any period"]',
    'Maximum 3 minutes',
    'Piece must be performed from memory'
  ),
  (
    category_id,
    'Contemporary Solo',
    '["One piece composed after 1960"]',
    'Maximum 3 minutes',
    'Piece must be performed from memory'
  );

  -- Insert jury members
  INSERT INTO event_jury (
    event_id,
    name,
    title,
    description,
    avatar_url
  ) VALUES
  (
    event_id,
    'Dr. Maria Chen',
    'DMA in Piano Performance, Juilliard School',
    'Internationally acclaimed pianist and educator with over 20 years of experience.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80'
  ),
  (
    event_id,
    'Prof. Hans Mueller',
    'Professor of Piano, Vienna Conservatory',
    'Renowned pedagogue and performer, specializing in Romantic repertoire.',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80'
  );

  -- Insert prizes
  INSERT INTO event_prizes (
    event_id,
    category_id,
    title,
    amount,
    description
  ) VALUES (
    event_id,
    category_id,
    'Elementary Level - First Prize',
    25000000,
    'Including performance opportunity at the gala concert'
  );
END $$;