-- `repertoires` was briefly introduced for prospectus documents. It is not
-- the existing category repertoire bucket (`categories-repertoires`). Its
-- objects must be removed through the Storage API before this migration runs.
DROP POLICY IF EXISTS "Allow public read access to event repertoires"
  ON storage.objects;

-- These policies only existed while cleaning up the live bucket. Keeping the
-- drops idempotent makes the migration safe in fresh environments too.
DROP POLICY IF EXISTS "Temporary obsolete bucket select"
  ON storage.buckets;
DROP POLICY IF EXISTS "Temporary obsolete bucket delete"
  ON storage.buckets;

-- Supabase guards direct storage metadata deletion. The bucket is empty at
-- this point, so opt in for this exact row without risking orphaned objects.
DO $$
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.buckets WHERE id = 'repertoires';
END
$$;
