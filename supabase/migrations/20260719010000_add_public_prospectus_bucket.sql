-- Public event prospectuses. Objects are grouped by event UUID:
-- prospectus/<event-id>/<localized-file-name>.pdf
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'prospectus',
  'prospectus',
  true,
  20971520,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public read access to event prospectus'
  ) THEN
    CREATE POLICY "Allow public read access to event prospectus"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'prospectus');
  END IF;
END
$$;
