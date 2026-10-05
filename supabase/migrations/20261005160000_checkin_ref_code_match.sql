-- The pass now carries the registration's reference code too. A scan is
-- "verified" only if the signed id AND reference code both match the
-- database; a mismatch is refused before anything is recorded.
-- (Test mode from 20261005150000 is unchanged.) The old 3-argument version is
-- dropped; p_ref_code defaults to null so the deployed Worker keeps working
-- until it starts sending it.
drop function if exists public.check_in_pass(uuid, text, text);
create or replace function public.check_in_pass(
  p_registration_id uuid,
  p_kind text,
  p_checked_in_by text,
  p_ref_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reg record;
  checkin record;
  inserted boolean;
  today date := (now() at time zone 'Asia/Jakarta')::date;
  event_days date[];
begin
  select r.id, r.event_id, r.ref_code, r.participant_name, r.registrant_name,
         r.registrant_status::text as registrant_status, r.song_title,
         r.status::text as status, c.name as category_name, s.name as subcategory_name,
         e.event_date, e.start_date
    into reg
    from registrations r
    join events e on e.id = r.event_id
    left join event_categories c on c.id = r.category_id
    left join event_subcategories s on s.id = r.subcategory_id
   where r.id = p_registration_id;

  if not found or reg.status = 'rejected'
     or (p_kind = 'teacher' and reg.registrant_status is distinct from 'teacher') then
    return jsonb_build_object('error', 'not_eligible');
  end if;
  if p_ref_code is not null and p_ref_code is distinct from reg.ref_code then
    return jsonb_build_object('error', 'mismatch');
  end if;

  select coalesce(array_agg(distinct ((d::timestamptz) at time zone 'Asia/Jakarta')::date order by ((d::timestamptz) at time zone 'Asia/Jakarta')::date), '{}')
    into event_days
    from jsonb_array_elements_text(case when jsonb_typeof(reg.event_date) = 'array' then reg.event_date else '[]'::jsonb end) d;
  if cardinality(event_days) = 0 and reg.start_date is not null then
    event_days := array[(reg.start_date at time zone 'Asia/Jakarta')::date];
  end if;

  if today = any(event_days) then
    insert into registration_checkins (registration_id, kind, checked_in_by)
    values (p_registration_id, p_kind, p_checked_in_by)
    on conflict (registration_id, kind) do nothing
    returning checked_in_at, checked_in_by into checkin;
    inserted := found;
  else
    inserted := false;
  end if;

  if not inserted then
    select checked_in_at, checked_in_by into checkin
      from registration_checkins
     where registration_id = p_registration_id and kind = p_kind;
  end if;

  return jsonb_build_object(
    'status', case
      when not (today = any(event_days)) then 'test'
      when inserted then 'checked_in'
      else 'already_checked_in' end,
    'kind', p_kind,
    'verified', p_ref_code is not null,
    'checkedInAt', checkin.checked_in_at,
    'checkedInBy', checkin.checked_in_by,
    'eventDays', to_jsonb(event_days),
    'registration', jsonb_build_object(
      'id', reg.id,
      'refCode', reg.ref_code,
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

revoke all on function public.check_in_pass(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.check_in_pass(uuid, text, text, text) to service_role;
