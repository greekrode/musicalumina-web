-- Turn RLS on for the 11 tables that had it off (anyone with the public anon
-- key could rewrite events, scores, winners, invitation codes...), and apply
-- the role model (Clerk publicMetadata.role, via public.clerk_role()):
--
--   admin        everything
--   staff        web admin, read-only
--   reg_staff    QR scanner only (its Worker uses the service role; nothing here)
--   jury         reads scoring data, writes only their own unfinalized scores
--   score_staff  reads scoring data only
--   (no role)    same as a signed-out visitor
--
-- Edge functions and the scanner Worker use the service role and are not
-- affected by RLS.

-- Old policies on these tables were inactive while RLS was off. Some use
-- auth.uid() (throws on Clerk ids) or let any signed-in user write, so they
-- must not wake up when RLS turns on. Drop them all first.
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'events', 'event_winners', 'event_prize_configurations', 'event_scoring',
      'event_scoring_aspects', 'event_scoring_details', 'event_scoring_history',
      'group_class_registrations', 'invitation_codes', 'masterclass_participants', 'songs')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.events enable row level security;
alter table public.event_winners enable row level security;
alter table public.event_prize_configurations enable row level security;
alter table public.event_scoring enable row level security;
alter table public.event_scoring_aspects enable row level security;
alter table public.event_scoring_details enable row level security;
alter table public.event_scoring_history enable row level security;
alter table public.group_class_registrations enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.masterclass_participants enable row level security;
alter table public.songs enable row level security;

-- ---------- role helpers ----------
create or replace function public.can_view_admin() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(public.clerk_role() in ('admin', 'staff'), false) $$;

create or replace function public.is_jury() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(public.clerk_role() = 'jury', false) $$;

create or replace function public.can_view_scores() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(public.clerk_role() in ('admin', 'jury', 'score_staff'), false) $$;

grant execute on function public.can_view_admin(), public.is_jury(), public.can_view_scores() to anon, authenticated;

-- ---------- web admin: staff get read access to everything admins manage ----------
-- (Tables from migration 20261005100000 already have admin-only ALL policies.)
-- Registrations and their performers are also needed by scoring (names).
drop policy if exists "Jury read registrations" on public.registrations;
drop policy if exists "Jury read registration participants" on public.registration_participants;
create policy "Staff and scorers read registrations" on public.registrations
  for select to authenticated using (public.can_view_admin() or public.can_view_scores());
create policy "Staff and scorers read registration participants" on public.registration_participants
  for select to authenticated using (public.can_view_admin() or public.can_view_scores());
create policy "Staff read contact messages" on public.contact_messages for select to authenticated using (public.can_view_admin());
create policy "Staff read customers" on public.customers for select to authenticated using (public.can_view_admin());
create policy "Staff read customer outreach" on public.customer_event_outreach for select to authenticated using (public.can_view_admin());
create policy "Staff read admin users" on public.admin_users for select to authenticated using (public.can_view_admin());
create policy "Staff read admin buckets" on storage.objects for select to authenticated
  using (public.can_view_admin() and bucket_id in ('jury-images', 'event-photos', 'categories-repertoires', 'registration-documents', 'payment-receipts'));

-- ---------- public catalog: anyone reads, admins write ----------
create policy "Anyone reads events" on public.events for select to anon, authenticated using (true);
create policy "Admins manage events" on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Anyone reads winners" on public.event_winners for select to anon, authenticated using (true);
create policy "Admins manage winners" on public.event_winners for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Anyone reads songs" on public.songs for select to anon, authenticated using (true);
create policy "Admins manage songs" on public.songs for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Past-masterclass pages list performers; admin holds stay private.
create policy "Anyone reads masterclass performers" on public.masterclass_participants
  for select to anon, authenticated using (not coalesce(is_hold, false) or public.can_view_admin());
create policy "Admins manage masterclass participants" on public.masterclass_participants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- admin-only data ----------
create policy "Staff read group class registrations" on public.group_class_registrations
  for select to authenticated using (public.can_view_admin());
create policy "Admins manage group class registrations" on public.group_class_registrations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Invitation codes never reach the browser: the invitation-code edge function
-- verifies and redeems them with the service role.
create policy "Staff read invitation codes" on public.invitation_codes
  for select to authenticated using (public.can_view_admin());
create policy "Admins manage invitation codes" on public.invitation_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.redeem_invitation_code(p_code_id uuid) returns boolean
language sql volatile security definer set search_path = ''
as $$
  with redeemed as (
    update public.invitation_codes set current_uses = current_uses + 1
    where id = p_code_id and active and current_uses < max_uses
      and (expires_at is null or expires_at > now())
    returning 1)
  select exists (select 1 from redeemed)
$$;
revoke all on function public.redeem_invitation_code(uuid) from public, anon, authenticated;
grant execute on function public.redeem_invitation_code(uuid) to service_role;

-- ---------- scoring ----------
create policy "Scorers read prize configurations" on public.event_prize_configurations
  for select to authenticated using (public.can_view_scores());
create policy "Admins manage prize configurations" on public.event_prize_configurations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Scorers read scoring aspects" on public.event_scoring_aspects
  for select to authenticated using (public.can_view_scores());
create policy "Admins manage scoring aspects" on public.event_scoring_aspects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A judge creates and edits only their own score, and only before an admin
-- finalizes it. Finalizing (finalized = true) is admin-only.
create policy "Scorers read scores" on public.event_scoring
  for select to authenticated using (public.can_view_scores());
create policy "Jury adds own scores" on public.event_scoring
  for insert to authenticated
  with check (public.is_jury() and jury_id = (auth.jwt() ->> 'sub') and not coalesce(finalized, false));
create policy "Jury edits own unfinalized scores" on public.event_scoring
  for update to authenticated
  using (public.is_jury() and jury_id = (auth.jwt() ->> 'sub') and not coalesce(finalized, false))
  with check (public.is_jury() and jury_id = (auth.jwt() ->> 'sub') and not coalesce(finalized, false));
create policy "Admins manage scores" on public.event_scoring
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_own_open_score(p_scoring_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_scoring
    where id = p_scoring_id and jury_id = (auth.jwt() ->> 'sub') and not coalesce(finalized, false))
$$;

-- History rows a judge writes must describe their own score, under the
-- judge name recorded on that score, so nobody can plant entries that read
-- as another judge's change.
create or replace function public.is_own_score_entry(p_scoring_id uuid, p_jury_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_scoring
    where id = p_scoring_id and jury_id = (auth.jwt() ->> 'sub')
      and jury_name is not distinct from p_jury_name)
$$;
grant execute on function public.is_own_open_score(uuid), public.is_own_score_entry(uuid, text) to authenticated;

create policy "Scorers read score details" on public.event_scoring_details
  for select to authenticated using (public.can_view_scores());
create policy "Jury writes own open score details" on public.event_scoring_details
  for all to authenticated
  using (public.is_jury() and public.is_own_open_score(scoring_id))
  with check (public.is_jury() and public.is_own_open_score(scoring_id));
create policy "Admins manage score details" on public.event_scoring_details
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Scorers read scoring history" on public.event_scoring_history
  for select to authenticated using (public.can_view_scores());
create policy "Jury appends history for own scores" on public.event_scoring_history
  for insert to authenticated
  with check (
    public.is_jury()
    and changed_by = (auth.jwt() ->> 'sub')
    and table_name = 'event_scoring'
    and public.is_own_score_entry(record_id, jury_name));
create policy "Admins manage scoring history" on public.event_scoring_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- storage ----------
-- Registration uploads stay insert-only for visitors; the
-- registration-upload-url edge function signs the fresh file. Nobody with the
-- anon key can list or download documents any more (signed URLs already
-- issued keep working).
drop policy if exists "Allow public read access to registration documents" on storage.objects;

-- Event photos are public content; the old policy only allowed signed-out
-- visitors, which hid photos from anyone signed in.
drop policy if exists "Public Access Event Photos" on storage.objects;
create policy "Anyone reads event photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'event-photos');

-- Uploads: only the three folders the public forms write to, only PDF/JPG/PNG,
-- enforced by the bucket itself (type + size) and by the insert policy (path).
-- Replaces the old policies: the anon one had no limits at all and the
-- authenticated one let any signed-in user (staff, jury, no role) write.
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
 where id = 'registration-documents';

drop policy if exists "Allow authenticated uploads to registration documents" on storage.objects;
drop policy if exists "Authenticated users can upload registration documents" on storage.objects;
create policy "Registration forms upload documents" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'registration-documents'
    and (storage.foldername(name))[1] in ('birth-certificates', 'song-pdfs', 'payment-receipts')
    and array_length(storage.foldername(name), 1) = 1
    and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png'));

-- Throttle for the invitation-code edge function (service role only; RLS on,
-- no policies, so nobody else can read or write it).
create table if not exists public.invitation_attempts (
  id bigint generated always as identity primary key,
  client_ip text not null,
  event_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists invitation_attempts_ip_time_idx on public.invitation_attempts (client_ip, created_at desc);
create index if not exists invitation_attempts_event_time_idx on public.invitation_attempts (event_id, created_at desc);
alter table public.invitation_attempts enable row level security;
revoke all on table public.invitation_attempts from anon, authenticated;
