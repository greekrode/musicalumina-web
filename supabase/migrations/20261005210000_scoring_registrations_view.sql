-- Jury and score_staff no longer read public.registrations directly: that
-- exposed registrant contact details, bank details, receipts and birth
-- certificates. They read scoring_registrations instead, which carries only
-- what scoring needs. Admin and web staff keep full table access.
--
-- The view runs with its owner's rights (security_invoker = false), so it is
-- not subject to the registrations RLS; its WHERE clause is the gate.
create or replace view public.scoring_registrations
with (security_invoker = false, security_barrier = true) as
select r.id, r.event_id, r.category_id, r.subcategory_id, r.participant_name, r.performers,
       r.song_title, r.song_duration, r.song_pdf_url, r.video_url, r.order_index,
       r.status, r.created_at
  from public.registrations r
 where public.can_view_scores() or public.can_view_admin();

revoke all on public.scoring_registrations from public, anon, authenticated;
grant select on public.scoring_registrations to authenticated;

drop policy if exists "Staff and scorers read registrations" on public.registrations;
create policy "Staff read registrations" on public.registrations
  for select to authenticated
  using (public.can_view_admin());
