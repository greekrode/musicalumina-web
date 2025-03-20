/*
  # Seed Piano Festival Categories and Subcategories

  1. Categories
    - Preparatory (688,000)
    - Elementary (728,000)
    - Intermediate (768,000)
    - Senior (798,000)
    - ABRSM Grades 1-8 (varying fees)
    - Free Choice (varying fees)

  2. Structure
    - Each category has specific age groups
    - Each subcategory has defined age requirements and fees
    - Order index ensures proper display order
*/

-- Function to create category with subcategories
CREATE OR REPLACE FUNCTION create_category_with_subcategories(
  p_event_id uuid,
  p_category_name text,
  p_subcategories jsonb
) RETURNS void AS $$
DECLARE
  v_category_id uuid;
  v_subcategory jsonb;
  v_order_index integer := 1;
BEGIN
  -- Create category
  INSERT INTO event_categories (
    event_id,
    name,
    description
  ) VALUES (
    p_event_id,
    p_category_name,
    'Competition category for ' || p_category_name
  ) RETURNING id INTO v_category_id;

  -- Create subcategories
  FOR v_subcategory IN SELECT * FROM jsonb_array_elements(p_subcategories)
  LOOP
    INSERT INTO event_subcategories (
      category_id,
      name,
      age_requirement,
      registration_fee,
      repertoire,
      performance_duration,
      order_index
    ) VALUES (
      v_category_id,
      v_subcategory->>'name',
      v_subcategory->>'age_requirement',
      (v_subcategory->>'registration_fee')::numeric,
      COALESCE((v_subcategory->'repertoire')::jsonb, '["One piece of choice"]'::jsonb),
      COALESCE(v_subcategory->>'performance_duration', 'Maximum 5 minutes'),
      v_order_index
    );
    v_order_index := v_order_index + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Seed categories for the event
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

  -- Preparatory Category
  PERFORM create_category_with_subcategories(
    v_event_id,
    'Preparatory',
    '[
      {"name": "Group A", "age_requirement": "6 years & below", "registration_fee": 688000},
      {"name": "Group B", "age_requirement": "7-8 years", "registration_fee": 688000},
      {"name": "Group C", "age_requirement": "9-11 years", "registration_fee": 688000}
    ]'::jsonb
  );

  -- Elementary Category
  PERFORM create_category_with_subcategories(
    v_event_id,
    'Elementary',
    '[
      {"name": "Group A", "age_requirement": "8 years & below", "registration_fee": 728000},
      {"name": "Group B", "age_requirement": "9-10 years", "registration_fee": 728000},
      {"name": "Group C", "age_requirement": "11-13 years", "registration_fee": 728000}
    ]'::jsonb
  );

  -- Intermediate Category
  PERFORM create_category_with_subcategories(
    v_event_id,
    'Intermediate',
    '[
      {"name": "Group A", "age_requirement": "10 years & below", "registration_fee": 768000},
      {"name": "Group B", "age_requirement": "11-13 years", "registration_fee": 768000},
      {"name": "Group C", "age_requirement": "14 years & above", "registration_fee": 768000}
    ]'::jsonb
  );

  -- Senior Category
  PERFORM create_category_with_subcategories(
    v_event_id,
    'Senior',
    '[
      {"name": "Group A", "age_requirement": "12 years & below", "registration_fee": 798000},
      {"name": "Group B", "age_requirement": "13-15 years", "registration_fee": 798000},
      {"name": "Group C", "age_requirement": "16 years & above", "registration_fee": 798000}
    ]'::jsonb
  );

  -- ABRSM Category
  PERFORM create_category_with_subcategories(
    v_event_id,
    'ABRSM',
    '[
      {"name": "Grade 1", "age_requirement": "All ages", "registration_fee": 688000, "repertoire": ["Pieces from ABRSM 2023-2024 / 2025-2026 syllabus A1-A3, B1-B3, C1-C3"]},
      {"name": "Grade 2", "age_requirement": "All ages", "registration_fee": 698000, "repertoire": ["Pieces from ABRSM 2023-2024 / 2025-2026 syllabus A1-A3, B1-B3, C1-C3"]},
      {"name": "Grade 3", "age_requirement": "All ages", "registration_fee": 708000, "repertoire": ["Pieces from ABRSM 2023-2024 / 2025-2026 syllabus A1-A3, B1-B3, C1-C3"]},
      {"name": "Grade 4", "age_requirement": "All ages", "registration_fee": 718000, "repertoire": ["Pieces from ABRSM 2023-2024 / 2025-2026 syllabus A1-A3, B1-B3, C1-C3"]},
      {"name": "Grade 5", "age_requirement": "All ages", "registration_fee": 728000, "repertoire": ["Pieces from ABRSM 2023-2024 / 2025-2026 syllabus A1-A3, B1-B3, C1-C3"]},
      {"name": "Grade 6", "age_requirement": "All ages", "registration_fee": 748000, "repertoire": ["Pieces from ABRSM 2023-2024 / 2025-2026 syllabus A1-A3, B1-B3, C1-C3"]},
      {"name": "Grade 7", "age_requirement": "All ages", "registration_fee": 768000, "repertoire": ["Pieces from ABRSM 2023-2024 / 2025-2026 syllabus A1-A3, B1-B3, C1-C3"]},
      {"name": "Grade 8", "age_requirement": "All ages", "registration_fee": 798000, "repertoire": ["Pieces from ABRSM 2023-2024 / 2025-2026 syllabus A1-A3, B1-B3, C1-C3"]}
    ]'::jsonb
  );

  -- Free Choice Category
  PERFORM create_category_with_subcategories(
    v_event_id,
    'Free Choice',
    '[
      {"name": "Group A", "age_requirement": "7 years & below", "registration_fee": 688000, "performance_duration": "Maximum 2 minutes"},
      {"name": "Group B", "age_requirement": "8-10 years", "registration_fee": 708000, "performance_duration": "Maximum 3 minutes"},
      {"name": "Group C", "age_requirement": "11-12 years", "registration_fee": 738000, "performance_duration": "Maximum 3 minutes"},
      {"name": "Group D", "age_requirement": "13-14 years", "registration_fee": 768000, "performance_duration": "Maximum 4 minutes"},
      {"name": "Group E", "age_requirement": "15 years & above", "registration_fee": 798000, "performance_duration": "Maximum 5 minutes"}
    ]'::jsonb
  );

END $$;