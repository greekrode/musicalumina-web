-- Artists in residence are site-wide profiles, not event jury assignments.
CREATE TABLE IF NOT EXISTS public.artists_in_residence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  description text,
  avatar_url text,
  credentials jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Preserve the existing artist profiles while removing their incorrect event
-- relationship. DISTINCT ON prevents duplicate profile copies where the same
-- artist had been attached to more than one event.
INSERT INTO public.artists_in_residence (
  name,
  title,
  description,
  avatar_url,
  credentials,
  created_at,
  updated_at
)
SELECT DISTINCT ON (name, title)
  name,
  title,
  description,
  avatar_url,
  credentials,
  created_at,
  created_at
FROM public.event_jury
WHERE role = 'artist_in_residence'
ORDER BY name, title, created_at
ON CONFLICT DO NOTHING;

-- An artist in residence is no longer a jury row and must not appear on an
-- individual event after the profile has been migrated.
DELETE FROM public.event_jury
WHERE role = 'artist_in_residence';

ALTER TABLE public.artists_in_residence ENABLE ROW LEVEL SECURITY;

-- Public site visitors can read the published profiles.
CREATE POLICY "Anyone can read artists in residence"
  ON public.artists_in_residence
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- This project currently identifies its Clerk-backed admin client with this
-- request header. Keep the policy aligned with that existing integration.
CREATE POLICY "Admin interface can manage artists in residence"
  ON public.artists_in_residence
  FOR ALL
  TO anon, authenticated
  USING (
    coalesce(current_setting('request.headers', true)::jsonb ->> 'x-admin-role', '') = 'admin'
  )
  WITH CHECK (
    coalesce(current_setting('request.headers', true)::jsonb ->> 'x-admin-role', '') = 'admin'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artists_in_residence TO anon, authenticated;
