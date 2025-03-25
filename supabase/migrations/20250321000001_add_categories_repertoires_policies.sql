-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('categories-repertoires', 'categories-repertoires', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to categories-repertoires
CREATE POLICY "Allow public read access to categories repertoires"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'categories-repertoires');

-- Create policy to prevent public deletions
CREATE POLICY "Prevent public deletions of categories repertoires"
ON storage.objects FOR DELETE
TO public
USING (false);

-- Create policy to prevent public updates
CREATE POLICY "Prevent public updates of categories repertoires"
ON storage.objects FOR UPDATE
TO public
USING (false); 