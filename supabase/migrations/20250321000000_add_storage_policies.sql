-- Create storage policies for registration-documents bucket
BEGIN;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for uploading files (authenticated users only)
CREATE POLICY "Allow authenticated uploads to registration documents" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'registration-documents' AND 
  (
    name LIKE 'birth-certificates/%' OR 
    name LIKE 'song-pdfs/%' OR 
    name LIKE 'payment-receipts/%'
  ) AND
  -- Restrict file size to 10MB
  (metadata->>'size')::int <= 10 * 1024 * 1024 AND
  -- Restrict file types
  CASE 
    WHEN name LIKE 'song-pdfs/%' THEN 
      lower(substring(name from '\.([^\.]+)$')) IN ('pdf')
    ELSE 
      lower(substring(name from '\.([^\.]+)$')) IN ('pdf', 'jpg', 'jpeg', 'png')
  END
);

-- Policy for reading files (public access)
CREATE POLICY "Allow public read access to registration documents" 
ON storage.objects 
FOR SELECT 
TO public 
USING (
  bucket_id = 'registration-documents'
);

-- Policy to prevent deletions except by service_role
CREATE POLICY "Prevent public deletions of registration documents" 
ON storage.objects 
FOR DELETE 
TO public 
USING (false);

-- Policy to prevent updates
CREATE POLICY "Prevent public updates of registration documents" 
ON storage.objects 
FOR UPDATE 
TO public 
USING (false);

COMMIT; 