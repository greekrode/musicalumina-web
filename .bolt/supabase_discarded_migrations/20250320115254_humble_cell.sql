/*
  # Update seed data to use event_winners table
  
  1. Changes
    - Update winner insertion function to use event_winners table
    - Remove winner-related columns from event_prizes table
    - Reseed event data with updated structure
*/

-- Function to create category and subcategory
CREATE OR REPLACE FUNCTION create_category_with_subcategories(
  p_event_id uuid,
  p_category_name text,
  p_subcategory_names text[] DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_category_id uuid;
  v_subcategory_name text;
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

  -- Create subcategories if provided
  IF p_subcategory_names IS NOT NULL THEN
    FOREACH v_subcategory_name IN ARRAY p_subcategory_names
    LOOP
      INSERT INTO event_subcategories (
        category_id,
        name,
        age_requirement,
        registration_fee,
        repertoire,
        performance_duration
      ) VALUES (
        v_category_id,
        v_subcategory_name,
        'All ages',
        500000, -- Default registration fee
        '["Free choice piece"]'::jsonb,
        'Maximum 10 minutes'
      );
    END LOOP;
  ELSE
    -- For standalone categories, create a single subcategory with the same name
    INSERT INTO event_subcategories (
      category_id,
      name,
      age_requirement,
      registration_fee,
      repertoire,
      performance_duration
    ) VALUES (
      v_category_id,
      p_category_name,
      'All ages',
      500000,
      '["Free choice piece"]'::jsonb,
      'Maximum 10 minutes'
    );
  END IF;

  RETURN v_category_id;
END;
$$ LANGUAGE plpgsql;

-- Function to insert winners
CREATE OR REPLACE FUNCTION insert_winner(
  p_event_id uuid,
  p_category_name text,
  p_subcategory_name text,
  p_participant_name text,
  p_prize text
) RETURNS void AS $$
DECLARE
  v_category_id uuid;
  v_subcategory_id uuid;
  v_prize_amount numeric;
BEGIN
  -- Get category ID
  SELECT id INTO v_category_id
  FROM event_categories
  WHERE event_id = p_event_id AND name = p_category_name;

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Category % not found', p_category_name;
  END IF;

  -- Get subcategory ID
  IF p_subcategory_name IS NOT NULL THEN
    SELECT id INTO v_subcategory_id
    FROM event_subcategories
    WHERE category_id = v_category_id AND name = p_subcategory_name;
  ELSE
    SELECT id INTO v_subcategory_id
    FROM event_subcategories
    WHERE category_id = v_category_id AND name = p_category_name;
  END IF;

  IF v_subcategory_id IS NULL THEN
    RAISE EXCEPTION 'Subcategory not found for category %', p_category_name;
  END IF;

  -- Calculate prize amount based on placement
  v_prize_amount := CASE
    WHEN p_prize LIKE '1st%' THEN 5000000
    WHEN p_prize LIKE '2nd%' THEN 3000000
    WHEN p_prize LIKE '3rd%' THEN 2000000
    WHEN p_prize LIKE '4th%' THEN 1000000
    WHEN p_prize LIKE '5th%' THEN 500000
    ELSE 250000 -- For commendations
  END;

  -- Insert winner
  INSERT INTO event_winners (
    event_id,
    category_id,
    subcategory_id,
    participant_name,
    prize_title,
    prize_amount
  ) VALUES (
    p_event_id,
    v_category_id,
    v_subcategory_id,
    p_participant_name,
    p_prize,
    v_prize_amount
  );
END;
$$ LANGUAGE plpgsql;

-- Insert the event and all related data
DO $$
DECLARE
  v_event_id uuid;
  v_category_id uuid;
BEGIN
  -- Insert event
  INSERT INTO events (
    title,
    type,
    start_date,
    location,
    status,
    description,
    overview,
    terms_and_conditions
  ) VALUES (
    'Beyond The Four Eras 2024',
    'competition',
    '2024-10-06 09:00:00+00',
    'Balai Resital Kertanegara, South Jakarta',
    'completed',
    'A prestigious piano competition showcasing young talents across various categories and skill levels.',
    'The Beyond The Four Eras competition brings together emerging pianists in a celebration of musical excellence across different periods of classical music.',
    jsonb_build_object(
      'registration', jsonb_build_object(
        'eligibility', 'Participants must meet age requirements for their respective categories',
        'documents', 'Valid identification and age verification required'
      ),
      'performance', jsonb_build_object(
        'guidelines', array[
          'All performances must be memorized',
          'Time limits must be strictly observed',
          'Original scores must be provided to the jury'
        ]
      )
    )
  ) RETURNING id INTO v_event_id;

  -- Insert jury members
  INSERT INTO event_jury (
    event_id,
    name,
    title,
    description,
    avatar_url,
    credentials
  ) VALUES 
    (
      v_event_id,
      'Dr. Nicholas Ong',
      'Piano Faculty',
      'Distinguished pianist and educator with extensive experience in international competitions',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80',
      '{"degrees": ["DMA in Piano Performance"], "awards": ["International Piano Competition Laureate"]}'::jsonb
    ),
    (
      v_event_id,
      'William Bunjamin',
      'Concert Pianist',
      'Acclaimed performer and pedagogue with a passion for nurturing young talents',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80',
      '{"degrees": ["Master of Music"], "specialization": ["Piano Performance", "Piano Pedagogy"]}'::jsonb
    ),
    (
      v_event_id,
      'Stephanie Onggowinoto',
      'Piano Virtuoso',
      'International competition laureate and dedicated music educator',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80',
      '{"degrees": ["Artist Diploma"], "awards": ["Young Artist Competition Winner"]}'::jsonb
    );

  -- Create categories and subcategories
  -- Polyphony category with divisions
  v_category_id := create_category_with_subcategories(
    v_event_id,
    'Polyphony',
    ARRAY['Junior', 'Senior', 'Artist']
  );

  -- ABRSM Grades
  v_category_id := create_category_with_subcategories(
    v_event_id,
    'ABRSM',
    ARRAY['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8']
  );

  -- Free Choice categories
  v_category_id := create_category_with_subcategories(
    v_event_id,
    'Free Choice',
    ARRAY['A', 'B', 'C', 'D', 'E']
  );

  -- Romantic & 20th Century
  v_category_id := create_category_with_subcategories(
    v_event_id,
    'Romantic & 20th Century',
    ARRAY['Junior Division', 'Senior Division', 'Artist Division']
  );

  -- Sonatina (standalone category)
  v_category_id := create_category_with_subcategories(v_event_id, 'Sonatina');

  -- Sonata with divisions
  v_category_id := create_category_with_subcategories(
    v_event_id,
    'Sonata',
    ARRAY['Senior', 'Artist']
  );

  -- Insert all winners
  -- Polyphony - Junior
  PERFORM insert_winner(v_event_id, 'Polyphony', 'Junior', 'Joseph Francis Lim', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Polyphony', 'Junior', 'Alesa Jillian', '3rd Prize');

  -- ABRSM - Grade 1
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 1', 'Ni Made Shri Anindia Tungga Puteri Kirana', '1st Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 1', 'Beverly Artesia Gani Chia', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 1', 'Keira Abigail Tjoa', '4th Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 1', 'Kathleen Charissa Gani', '5th Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 1', 'Cleo Xaviera Wijaya', 'Commendation');

  -- ABRSM - Grade 2
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 2', 'Putu Hira Nirwasita Senet', '1st Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 2', 'Giselle Naomi Woo', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 2', 'Mikhael Naval Anggoro', '4th Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 2', 'Louisa Camille Asihwardji', '5th Prize');

  -- Free Choice - A
  PERFORM insert_winner(v_event_id, 'Free Choice', 'A', 'Rachel Charlotte Gunawan', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'A', 'Milla Natasha', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'A', 'Kathleen Charissa Gani', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'A', 'Mikael Finn Oliver', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'A', 'Gemilang Cahaya Nugroho', '5th Prize');

  -- Sonatina
  PERFORM insert_winner(v_event_id, 'Sonatina', NULL, 'Claire Abigail Quinn', '1st Prize');

  -- Free Choice - B
  PERFORM insert_winner(v_event_id, 'Free Choice', 'B', 'Callia Kardiono', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'B', 'Alaia Zahira Temenggung', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'B', 'Ester Gabrielle Shalom Tambunan', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'B', 'Winston James Winatal', '4th Prize');

  -- ABRSM - Grade 3
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 3', 'Carlson Alexander Teoh', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 3', 'Carissa Orzora Manalu', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 3', 'Grace Karissa Aristanto', '4th Prize');

  -- Free Choice - C
  PERFORM insert_winner(v_event_id, 'Free Choice', 'C', 'Malaika Sasha Jaya Putri', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'C', 'Rowanne Eleanor Amanto', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'C', 'Rafael Jaime Christoffer', '3rd Prize');

  -- Romantic & 20th Century - Junior Division
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Junior Division', 'Claire Hartono', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Junior Division', 'Timothy Sam Kosasih', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Junior Division', 'Lindsy Alexa D''letizia', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Junior Division', 'Raein Sophilius Kosasih', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Junior Division', 'Dominic Gaudio Shanahan', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Junior Division', 'Phillippe Carlson Rusli', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Junior Division', 'Candice Vimala Sukma', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Junior Division', 'Putu Hira Nirwasita Senet', '5th Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Junior Division', 'I Gusti Ngurah Agung Adhi Satria Aryatama Raka', '5th Prize');

  -- ABRSM - Grade 4
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 4', 'Adrianne Shanelle Yao', '1st Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 4', 'Skye Gwyneth Isabelle Lim', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 4', 'Saraswien Oriana Lumban Gaol', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 4', 'I Gusti Ngurah Agung Adhi Satria Aryatama Raka', '4th Prize');

  -- ABRSM - Grade 5
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 5', 'Olivia', '2nd Prize');

  -- ABRSM - Grade 6
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 6', 'Nicholas Dylan Tjahjadi', '1st Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 6', 'Cherry Carissa Ho', '2nd Prize');

  -- Polyphony - Senior
  PERFORM insert_winner(v_event_id, 'Polyphony', 'Senior', 'Stephanie Gwen Liem', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Polyphony', 'Senior', 'Nadinesky Wijaya', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Polyphony', 'Senior', 'Amanda Nararya Alani', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'Polyphony', 'Senior', 'Kathleen Kho', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Polyphony', 'Senior', 'Jayrell Keyson Corich', '5th Prize');

  -- ABRSM - Grade 7
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 7', 'Sheralisa Olenka Lumban Gaol', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 7', 'Kirana Anggraini', '3rd Prize');

  -- Free Choice - D
  PERFORM insert_winner(v_event_id, 'Free Choice', 'D', 'Kirana Adhilla Sarasvati', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'D', 'Angelina Zoe Zhou', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'D', 'Abilio Antonio De Araujo', '4th Prize');

  -- Romantic & 20th Century - Senior Division
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Senior Division', 'Skye Hartono', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Senior Division', 'Cornelius Carlton Chandra', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Senior Division', 'Gretalline Chloe Tan', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Senior Division', 'Wyn Alexander Papan', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Senior Division', 'Calya Anara Wijaya', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Senior Division', 'Abigail Suherman', '5th Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Senior Division', 'Emmanuella Sherleen Kurniadi', '5th Prize');

  -- Sonata - Senior
  PERFORM insert_winner(v_event_id, 'Sonata', 'Senior', 'Ann Shereen Yao', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Sonata', 'Senior', 'Giselle Odilia Kosasih', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Sonata', 'Senior', 'Alexandra Kirana Mulyono', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'Sonata', 'Senior', 'Cornelius Carlton Chandra', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Sonata', 'Senior', 'Gretalline Chloe Tan', '5th Prize');

  -- Free Choice - E
  PERFORM insert_winner(v_event_id, 'Free Choice', 'E', 'Michelle Holly Santoso', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'E', 'Guinevere The', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'E', 'Christabel Estelle Oei', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'E', 'Jennifer Audrey Kho', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Free Choice', 'E', 'Chelsea Annabelle Aurelia', '5th Prize');

  -- ABRSM - Grade 8
  PERFORM insert_winner(v_event_id, 'ABRSM', 'Grade 8', 'Christabel Estelle Oei', '3rd Prize');

  -- Sonata - Artist
  PERFORM insert_winner(v_event_id, 'Sonata', 'Artist', 'Emma Samantha Bingei', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Sonata', 'Artist', 'Nayla Arifa Salwa', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Sonata', 'Artist', 'Michelle Holly Santoso', '4th Prize');

  -- Romantic & 20th Century - Artist Division
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Artist Division', 'Nayla Arifa Salwa', '1st Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Artist Division', 'Emma Samantha Bingei', '2nd Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Artist Division', 'Jorel Aviello', '3rd Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Artist Division', 'Nicole Joy Nathan', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Artist Division', 'Chelsea Angelica Hartono', '4th Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Artist Division', 'Oei Fidelia Annabel Gunawan', '5th Prize');
  PERFORM insert_winner(v_event_id, 'Romantic & 20th Century', 'Artist Division', 'Juan Amadeus Sarumaha', '5th Prize');

END $$;