-- Group entries (e.g. a piano duet) are one registration, scored once, but
-- every performer needs their own pass and their own check-in.
--   registrations.performers: optional list of names; null = solo entry.
--   Pass kind "performer:<n>" (0-based index into performers) checks in that
--   person; registration_checkins stores one row per performer.
-- Also: check-in now requires the registration to be verified (paid).
alter table public.registrations add column if not exists performers text[];

alter table public.registration_checkins drop constraint if exists registration_checkins_kind_check;
alter table public.registration_checkins add constraint registration_checkins_kind_check
  check (kind in ('participant', 'teacher') or kind ~ '^performer:[0-9]{1,2}$');

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
  performer int;
  display_name text;
begin
  select r.id, r.event_id, r.ref_code, r.participant_name, r.registrant_name, r.performers,
         r.registrant_status::text as registrant_status, r.song_title,
         r.status::text as status, c.name as category_name, s.name as subcategory_name,
         e.event_date, e.start_date
    into reg
    from registrations r
    join events e on e.id = r.event_id
    left join event_categories c on c.id = r.category_id
    left join event_subcategories s on s.id = r.subcategory_id
   where r.id = p_registration_id;

  if p_kind ~ '^performer:[0-9]{1,2}$' then
    performer := split_part(p_kind, ':', 2)::int;
  end if;

  if not found or reg.status is distinct from 'verified'
     or (p_kind = 'teacher' and reg.registrant_status is distinct from 'teacher')
     or (p_kind not in ('participant', 'teacher') and performer is null)
     or (performer is not null and (reg.performers is null or performer >= cardinality(reg.performers))) then
    return jsonb_build_object('error', 'not_eligible');
  end if;
  if p_ref_code is not null and p_ref_code is distinct from reg.ref_code then
    return jsonb_build_object('error', 'mismatch');
  end if;

  display_name := case
    when p_kind = 'teacher' then reg.registrant_name
    when performer is not null then reg.performers[performer + 1]
    else reg.participant_name end;

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
    'kind', case when performer is not null then 'performer' else p_kind end,
    'verified', p_ref_code is not null,
    'checkedInAt', checkin.checked_in_at,
    'checkedInBy', checkin.checked_in_by,
    'eventDays', to_jsonb(event_days),
    'registration', jsonb_build_object(
      'id', reg.id,
      'refCode', reg.ref_code,
      'eventId', reg.event_id,
      'name', display_name,
      -- For a performer: the entry they perform in (e.g. the duet).
      'entryName', case when performer is not null then reg.participant_name end,
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
