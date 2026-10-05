-- Replace the forgeable `x-admin-role` request header with Clerk session claims.
--
-- Before: the browser sent `x-admin-role: admin` with the public anon key, and
-- RLS trusted it. Anyone could send that header (curl, devtools) and write
-- events, jury, categories, fees, artists, storage. Registrations (bank
-- account numbers, birth certificates) and contact messages were readable by
-- anyone, and customers were fully open.
--
-- After: the admin Supabase client sends the signed-in user's Clerk session
-- token (Supabase third-party auth). `is_admin()`/`clerk_role()` trust only the
-- verified token's publicMetadata role. Public visitors keep the anon key and
-- get only the reads/inserts the public site needs.
--
-- PREREQUISITES, in order (see supabase/functions/README.md § Clerk auth):
--   1. Clerk dashboard: enable the Supabase integration (adds role=authenticated).
--   2. Supabase dashboard: Authentication > Third-party auth > add Clerk.
--   3. Clerk dashboard: Sessions > Customize session token, add
--      { "metadata": "{{user.public_metadata}}" }; give each person publicMetadata
--      { "role": "admin" | "jury" | "staff" }.
--   4. Deploy the web app (accessToken client), then apply this migration.
--
-- Out of scope (RLS is still OFF there; they need the scoring app and tools
-- moved to Clerk tokens first): events, event_winners, event_scoring*,
-- event_prize_configurations, invitation_codes, masterclass_participants,
-- group_class_registrations, songs.

-- Role = Clerk publicMetadata.role, put in the session token by the Clerk
-- session-token template { "metadata": "{{user.public_metadata}}" }.
-- publicMetadata is writable only from the Clerk dashboard or backend API.
-- (Not the top-level "role" claim: Supabase uses that as the Postgres role.)
-- Roles: admin (web admin, full access), jury (scoring app: reads
-- registrations), staff (QR scanner only; its Worker uses the service role, so
-- staff get nothing here). Legacy "org:admin" counts as admin.
create or replace function public.clerk_role() returns text
language sql stable
set search_path = ''
as $$ select regexp_replace(auth.jwt() -> 'metadata' ->> 'role', '^org:', '') $$;

create or replace function public.is_admin() returns boolean
language sql stable
set search_path = ''
as $$ select coalesce(public.clerk_role() = 'admin', false) $$;

-- RLS-free lookups for public flows that must not read registrations directly.
create or replace function public.is_pending_registration(p_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.registrations where id = p_id and status = 'pending') $$;

create or replace function public.event_registration_count(p_event_id uuid) returns bigint
language sql stable security definer
set search_path = ''
as $$ select count(*) from public.registrations where event_id = p_event_id and status in ('pending', 'verified') $$;

grant execute on function public.clerk_role(), public.is_admin(), public.is_pending_registration(uuid), public.event_registration_count(uuid)
  to anon, authenticated;

-- ---------- admin-managed tables (public read stays where it was) ----------
drop policy if exists "Admin interface can manage artists in residence" on public.artists_in_residence;
create policy "Admins manage artists in residence" on public.artists_in_residence
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Enable write access for admin users" on public.event_categories;
create policy "Admins manage event categories" on public.event_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Enable write access for admin users" on public.event_subcategories;
create policy "Admins manage event subcategories" on public.event_subcategories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Enable admin access to event_jury" on public.event_jury;
drop policy if exists "Admins can do all on event jury" on public.event_jury;
drop policy if exists "Allow full access to admin users" on public.event_jury;
create policy "Admins manage event jury" on public.event_jury
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin interface can manage event registration fees" on public.event_registration_fees;
create policy "Admins manage event registration fees" on public.event_registration_fees
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Allow all access on customers" on public.customers;
create policy "Admins manage customers" on public.customers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Allow all access on customer_event_outreach" on public.customer_event_outreach;
create policy "Admins manage customer outreach" on public.customer_event_outreach
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Enable read access for admin users" on public.admin_users;
create policy "Admins read admin users" on public.admin_users
  for select to authenticated using (public.is_admin());

-- ---------- contact messages: public may submit, only admins may read ----------
drop policy if exists "Admins can do all on contact messages" on public.contact_messages;
drop policy if exists "Enable service role insert" on public.contact_messages;
drop policy if exists "Enable service role select" on public.contact_messages;
drop policy if exists "Enable service role update" on public.contact_messages;
create policy "Admins manage contact messages" on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- registrations: public may submit pending, only admins (and jury) may read ----------
drop policy if exists "Admins can do all on registrations" on public.registrations;
drop policy if exists "Enable delete for admins" on public.registrations;
drop policy if exists "Authenticated users can create registrations" on public.registrations;
drop policy if exists "Enable insert for authenticated users" on public.registrations;
drop policy if exists "Allow valid registrations only" on public.registrations;
drop policy if exists "Allow users to view own registrations" on public.registrations;
drop policy if exists "Enable read access for all users" on public.registrations;
drop policy if exists "Authenticated users can read own registrations" on public.registrations;
drop policy if exists "Allow authenticated users to update status" on public.registrations;
drop policy if exists "Enable update for admins" on public.registrations;
drop policy if exists "Allow status verification updates" on public.registrations;
create policy "Public can submit pending registrations" on public.registrations
  for insert to anon, authenticated with check (status = 'pending' and event_id is not null);
create policy "Admins manage registrations" on public.registrations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Jury read registrations" on public.registrations
  for select to authenticated using (public.clerk_role() = 'jury');

drop policy if exists "Admin interface can delete registration participants" on public.registration_participants;
drop policy if exists "Admin interface can update registration participants" on public.registration_participants;
drop policy if exists "Anyone can create registration participants" on public.registration_participants;
-- Performer names + birth-certificate links: no longer world-readable.
drop policy if exists "Anyone can read registration participants" on public.registration_participants;
create policy "Public can add participants to a pending registration" on public.registration_participants
  for insert to anon, authenticated with check (public.is_admin() or public.is_pending_registration(registration_id));
create policy "Admins manage registration participants" on public.registration_participants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Jury read registration participants" on public.registration_participants
  for select to authenticated using (public.clerk_role() = 'jury');

-- ---------- storage: admin buckets are admin-write ----------
drop policy if exists "Enable admin delete access to jury-images" on storage.objects;
drop policy if exists "Enable delete access to jury-images" on storage.objects;
drop policy if exists "Enable upload access to jury-images" on storage.objects;
drop policy if exists "Enable update access to jury-images" on storage.objects;
drop policy if exists "Admin Header Upload Event Photos" on storage.objects;
drop policy if exists "Enable upload access to event-photos 1rdror8_0" on storage.objects;
drop policy if exists "Authenticated Users Can Upload Event Photos" on storage.objects;
drop policy if exists "Authenticated Users Can Delete Event Photos" on storage.objects;
drop policy if exists "Authenticated Users Can Upload Repertoire Files" on storage.objects;
drop policy if exists "Authenticated Users Can Delete Repertoire Files" on storage.objects;
drop policy if exists "Authenticated Users Can Update Repertoire Files" on storage.objects;
drop policy if exists "Allow users to delete their own uploads" on storage.objects;
-- auth.uid() casts the JWT sub to uuid; Clerk ids (user_...) make it throw.
drop policy if exists "Users can read their own documents" on storage.objects;
create policy "Admins manage admin buckets" on storage.objects
  for all to authenticated
  using (public.is_admin() and bucket_id in ('jury-images', 'event-photos', 'categories-repertoires', 'registration-documents', 'payment-receipts'))
  with check (public.is_admin() and bucket_id in ('jury-images', 'event-photos', 'categories-repertoires', 'registration-documents', 'payment-receipts'));
