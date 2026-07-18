-- Public event-level prospectuses. Objects are grouped by event UUID:
-- repertoires/<event-id>/<localized-file-name>.pdf
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'repertoires',
  'repertoires',
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
      AND policyname = 'Allow public read access to event repertoires'
  ) THEN
    CREATE POLICY "Allow public read access to event repertoires"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'repertoires');
  END IF;
END
$$;
