-- The admin UI uses Clerk while its Supabase client is anonymous. Replace the
-- Supabase-Auth-only fee policies with the project-wide admin request policy.
-- Public visitors retain read-only access to fee information.
DROP POLICY IF EXISTS "Enable delete for authenticated users only"
  ON public.event_registration_fees;
DROP POLICY IF EXISTS "Enable insert for authenticated users only"
  ON public.event_registration_fees;
DROP POLICY IF EXISTS "Enable update for authenticated users only"
  ON public.event_registration_fees;
DROP POLICY IF EXISTS "Admin interface can manage event registration fees"
  ON public.event_registration_fees;

CREATE POLICY "Admin interface can manage event registration fees"
  ON public.event_registration_fees
  FOR ALL
  TO anon, authenticated
  USING (
    coalesce(current_setting('request.headers', true)::jsonb ->> 'x-admin-role', '') = 'admin'
  )
  WITH CHECK (
    coalesce(current_setting('request.headers', true)::jsonb ->> 'x-admin-role', '') = 'admin'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registration_fees TO anon, authenticated;
