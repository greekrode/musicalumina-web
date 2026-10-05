-- QR check-in v2: one round trip per scan.
--
-- A teacher pass and a participant pass can point at the same registration
-- row (registrant_status = 'teacher'), so a check-in is keyed by
-- (registration, kind). The table is empty when this runs.
alter table public.registration_checkins
  add column if not exists kind text not null default 'participant'
    check (kind in ('participant', 'teacher'));

alter table public.registration_checkins drop constraint if exists registration_checkins_pkey;
alter table public.registration_checkins add primary key (registration_id, kind);

-- Called only by the scanner Worker with the service role, after it has
-- verified the staff member's Clerk session and the pass signature.
create or replace function public.check_in_pass(
  p_registration_id uuid,
  p_kind text,
  p_checked_in_by text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reg record;
  checkin record;
  inserted boolean;
begin
  select r.id, r.event_id, r.participant_name, r.registrant_name,
         r.registrant_status::text as registrant_status, r.song_title,
         r.status::text as status, c.name as category_name, s.name as subcategory_name
    into reg
    from registrations r
    left join event_categories c on c.id = r.category_id
    left join event_subcategories s on s.id = r.subcategory_id
   where r.id = p_registration_id;

  if not found or reg.status = 'rejected'
     or (p_kind = 'teacher' and reg.registrant_status is distinct from 'teacher') then
    return jsonb_build_object('error', 'not_eligible');
  end if;

  insert into registration_checkins (registration_id, kind, checked_in_by)
  values (p_registration_id, p_kind, p_checked_in_by)
  on conflict (registration_id, kind) do nothing
  returning checked_in_at, checked_in_by into checkin;
  inserted := found;

  if not inserted then
    select checked_in_at, checked_in_by into checkin
      from registration_checkins
     where registration_id = p_registration_id and kind = p_kind;
  end if;

  return jsonb_build_object(
    'status', case when inserted then 'checked_in' else 'already_checked_in' end,
    'kind', p_kind,
    'checkedInAt', checkin.checked_in_at,
    'checkedInBy', checkin.checked_in_by,
    'registration', jsonb_build_object(
      'id', reg.id,
      'eventId', reg.event_id,
      'name', case when p_kind = 'teacher' then reg.registrant_name else reg.participant_name end,
      'songTitle', reg.song_title,
      'categoryName', reg.category_name,
      'subCategoryName', reg.subcategory_name,
      'registrationStatus', reg.status
    )
  );
end;
$$;

revoke all on function public.check_in_pass(uuid, text, text) from public, anon, authenticated;
grant execute on function public.check_in_pass(uuid, text, text) to service_role;
