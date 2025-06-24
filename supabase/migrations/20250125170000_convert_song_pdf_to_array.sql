-- Convert song_pdf_url from text to text[] array
-- Handle existing data by wrapping single URLs in arrays

-- First, add a new column with array type
ALTER TABLE public.registrations 
ADD COLUMN song_pdf_urls text[];

-- Migrate existing data: convert single URLs to single-element arrays
UPDATE public.registrations 
SET song_pdf_urls = CASE 
  WHEN song_pdf_url IS NOT NULL AND song_pdf_url != '' THEN ARRAY[song_pdf_url]
  ELSE NULL
END;

-- Drop the old column
ALTER TABLE public.registrations 
DROP COLUMN song_pdf_url;

-- Rename the new column to match the original name but with array semantics
ALTER TABLE public.registrations 
RENAME COLUMN song_pdf_urls TO song_pdf_url; 