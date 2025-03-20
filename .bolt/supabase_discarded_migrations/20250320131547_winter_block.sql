/*
  # Add prizes to the event

  1. New Data
    - Add overall prizes (apply to all categories)
    - Add category-specific prizes
    - Update existing event with prize information

  2. Changes
    - Insert prize records for the Lumina Signature Piano Festival
*/

DO $$
DECLARE
  v_event_id uuid;
BEGIN
  -- Get the event ID
  SELECT id INTO v_event_id
  FROM events
  WHERE title = 'Lumina Signature Piano Festival 2025';

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Insert overall prizes (no specific category)
  INSERT INTO event_prizes (
    event_id,
    title,
    amount,
    description
  ) VALUES
    (v_event_id, 'Grand Champion', 25000000, 'Highest overall score across all categories'),
    (v_event_id, 'Most Outstanding Performance', 15000000, 'Best artistic interpretation'),
    (v_event_id, 'Special Jury Award', 10000000, 'Special recognition from the jury panel');

  -- Insert category-specific prizes
  -- Preparatory Category
  WITH category AS (
    SELECT id FROM event_categories 
    WHERE event_id = v_event_id AND name = 'Preparatory'
  )
  INSERT INTO event_prizes (event_id, category_id, title, amount) 
  SELECT v_event_id, id, title, amount
  FROM category,
  (VALUES 
    ('First Prize', 5000000),
    ('Second Prize', 3000000),
    ('Third Prize', 2000000)
  ) AS prizes(title, amount);

  -- Elementary Category
  WITH category AS (
    SELECT id FROM event_categories 
    WHERE event_id = v_event_id AND name = 'Elementary'
  )
  INSERT INTO event_prizes (event_id, category_id, title, amount) 
  SELECT v_event_id, id, title, amount
  FROM category,
  (VALUES 
    ('First Prize', 7500000),
    ('Second Prize', 5000000),
    ('Third Prize', 3000000)
  ) AS prizes(title, amount);

  -- Intermediate Category
  WITH category AS (
    SELECT id FROM event_categories 
    WHERE event_id = v_event_id AND name = 'Intermediate'
  )
  INSERT INTO event_prizes (event_id, category_id, title, amount) 
  SELECT v_event_id, id, title, amount
  FROM category,
  (VALUES 
    ('First Prize', 10000000),
    ('Second Prize', 7500000),
    ('Third Prize', 5000000)
  ) AS prizes(title, amount);

  -- Senior Category
  WITH category AS (
    SELECT id FROM event_categories 
    WHERE event_id = v_event_id AND name = 'Senior'
  )
  INSERT INTO event_prizes (event_id, category_id, title, amount) 
  SELECT v_event_id, id, title, amount
  FROM category,
  (VALUES 
    ('First Prize', 15000000),
    ('Second Prize', 10000000),
    ('Third Prize', 7500000)
  ) AS prizes(title, amount);

  -- ABRSM Category
  WITH category AS (
    SELECT id FROM event_categories 
    WHERE event_id = v_event_id AND name = 'ABRSM'
  )
  INSERT INTO event_prizes (event_id, category_id, title, amount) 
  SELECT v_event_id, id, title, amount
  FROM category,
  (VALUES 
    ('First Prize', 5000000),
    ('Second Prize', 3000000),
    ('Third Prize', 2000000),
    ('High Distinction', NULL)
  ) AS prizes(title, amount);

  -- Free Choice Category
  WITH category AS (
    SELECT id FROM event_categories 
    WHERE event_id = v_event_id AND name = 'Free Choice'
  )
  INSERT INTO event_prizes (event_id, category_id, title, amount) 
  SELECT v_event_id, id, title, amount
  FROM category,
  (VALUES 
    ('First Prize', 7500000),
    ('Second Prize', 5000000),
    ('Third Prize', 3000000),
    ('Special Mention', NULL)
  ) AS prizes(title, amount);

END $$;