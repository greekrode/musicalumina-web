-- Per-date masterclass capacity and multi-date bookings.
-- `events.event_schedule` remains the schedule source of truth. Each masterclass
-- window now carries a required `max_slots` value configured by an administrator.

alter table public.masterclass_participants
  add column if not exists session_date date,
  add column if not exists is_hold boolean not null default false,
  add column if not exists hold_label text,
  add column if not exists hold_notes text;

update public.masterclass_participants
set session_date = (preferred_start_at at time zone 'Asia/Jakarta')::date
where session_date is null
  and preferred_start_at is not null;

-- A registration can now book one session on each selected date. Older
-- single-date registrations remain valid because their `session_date` is null.
drop index if exists public.masterclass_participants_registration_id_key;

create unique index if not exists masterclass_participants_registration_session_date_key
  on public.masterclass_participants (registration_id, session_date)
  where registration_id is not null and session_date is not null;

create index if not exists masterclass_participants_event_session_date_idx
  on public.masterclass_participants (event_id, session_date);

alter table public.masterclass_participants
  drop constraint if exists masterclass_participants_hold_label_check;

alter table public.masterclass_participants
  add constraint masterclass_participants_hold_label_check
  check (
    not is_hold
    or (registration_id is null and length(trim(coalesce(hold_label, ''))) > 0)
  );

-- Preserve a sensible starting point for existing masterclasses. Administrators
-- can adjust every value independently in the event editor afterwards.
update public.events
set event_schedule = (
  select jsonb_agg(
    case
      when session ? 'max_slots' then session
      when max_quota is not null and max_quota > 0
        then session || jsonb_build_object('max_slots', max_quota)
      else session
    end
  )
  from jsonb_array_elements(event_schedule) as session
)
where type = 'masterclass'
  and event_schedule is not null;

drop function if exists public.get_masterclass_available_slots(uuid, integer, integer);
drop function if exists public.create_masterclass_registration(uuid, text, uuid, registrant_status, text, text, text, text, integer, timestamptz, integer, integer, text[], text, text, text, text[], text);

create function public.get_masterclass_available_slots(
  p_event_id uuid,
  p_session_date date,
  p_duration_minutes integer,
  p_number_of_slots integer
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
  v_schedule jsonb;
  v_allowed_durations integer[];
  v_window jsonb;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_candidate_start timestamptz;
  v_candidate_end timestamptz;
  v_lunch_start timestamptz;
  v_lunch_end timestamptz;
  v_total_minutes integer;
  v_max_slots integer;
  v_booked_slots integer;
begin
  if p_session_date is null
    or p_duration_minutes <= 0
    or p_number_of_slots not between 1 and 3 then
    return;
  end if;

  select type::text, event_schedule, event_duration
  into v_event_type, v_schedule, v_allowed_durations
  from public.events
  where id = p_event_id;

  if v_event_type is distinct from 'masterclass'
    or v_schedule is null
    or not (p_duration_minutes = any(coalesce(v_allowed_durations, '{}'::integer[]))) then
    return;
  end if;

  v_total_minutes := p_duration_minutes * p_number_of_slots;

  for v_window in select value from jsonb_array_elements(v_schedule)
  loop
    begin
      v_window_start := (v_window ->> 'start_at')::timestamptz;
      v_window_end := (v_window ->> 'end_at')::timestamptz;
      v_max_slots := (v_window ->> 'max_slots')::integer;
    exception when others then
      continue;
    end;

    if v_window_end <= v_window_start
      or v_max_slots <= 0
      or (v_window_start at time zone 'Asia/Jakarta')::date <> p_session_date then
      continue;
    end if;

    select coalesce(sum(participant.number_of_slots), 0)
    into v_booked_slots
    from public.masterclass_participants participant
    where participant.event_id = p_event_id
      and coalesce(
        participant.session_date,
        (participant.preferred_start_at at time zone 'Asia/Jakarta')::date
      ) = p_session_date;

    if v_booked_slots + p_number_of_slots > v_max_slots then
      return;
    end if;

    for v_candidate_start in
      select generate_series(
        v_window_start,
        v_window_end - make_interval(mins => v_total_minutes),
        interval '15 minutes'
      )
    loop
      v_candidate_end := v_candidate_start + make_interval(mins => v_total_minutes);
      v_lunch_start := (
        ((v_candidate_start at time zone 'Asia/Jakarta')::date + time '12:00')
        at time zone 'Asia/Jakarta'
      );
      v_lunch_end := v_lunch_start + interval '1 hour';

      if tstzrange(v_candidate_start, v_candidate_end, '[)')
          && tstzrange(v_lunch_start, v_lunch_end, '[)') then
        continue;
      end if;

      if not exists (
        select 1
        from public.masterclass_participants participant
        where participant.event_id = p_event_id
          and tstzrange(participant.preferred_start_at, participant.preferred_end_at, '[)')
              && tstzrange(v_candidate_start, v_candidate_end, '[)')
      ) then
        slot_start := v_candidate_start;
        slot_end := v_candidate_end;
        return next;
      end if;
    end loop;
  end loop;
end;
$$;

create function public.create_masterclass_registration(
  p_registration_id uuid,
  p_ref_code text,
  p_event_id uuid,
  p_registrant_status registrant_status,
  p_registrant_name text,
  p_registrant_whatsapp text,
  p_registrant_email text,
  p_participant_name text,
  p_participant_age integer,
  p_duration_minutes integer,
  p_sessions jsonb,
  p_repertoire text[],
  p_bank_name text,
  p_bank_account_number text,
  p_bank_account_name text,
  p_song_pdf_url text[],
  p_payment_receipt_url text
)
returns table (registration_id uuid, registration_created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration public.registrations%rowtype;
  v_event_type text;
  v_schedule jsonb;
  v_allowed_durations integer[];
  v_session jsonb;
  v_window jsonb;
  v_session_date date;
  v_preferred_start_at timestamptz;
  v_preferred_end_at timestamptz;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_lunch_start timestamptz;
  v_lunch_end timestamptz;
  v_number_of_slots integer;
  v_max_slots integer;
  v_booked_slots integer;
  v_first_start_at timestamptz;
begin
  if p_participant_name is null or length(trim(p_participant_name)) < 3
    or p_participant_age not between 1 and 100
    or p_registrant_whatsapp is null or p_registrant_email is null
    or p_bank_name is null or p_bank_account_number is null or p_bank_account_name is null
    or p_payment_receipt_url is null
    or coalesce(cardinality(p_repertoire), 0) = 0
    or jsonb_typeof(p_sessions) is distinct from 'array'
    or jsonb_array_length(p_sessions) = 0 then
    raise exception 'Invalid masterclass registration' using errcode = '22023';
  end if;

  -- Lock the event row so capacity checks and inserts are serialised across
  -- simultaneous public registrations for the same masterclass.
  select type::text, event_schedule, event_duration
  into v_event_type, v_schedule, v_allowed_durations
  from public.events
  where id = p_event_id
  for update;

  if v_event_type is distinct from 'masterclass'
    or v_schedule is null
    or not (p_duration_minutes = any(coalesce(v_allowed_durations, '{}'::integer[]))) then
    raise exception 'Invalid masterclass session' using errcode = '22023';
  end if;

  for v_session in select value from jsonb_array_elements(p_sessions)
  loop
    begin
      v_session_date := (v_session ->> 'session_date')::date;
      v_preferred_start_at := (v_session ->> 'preferred_start_at')::timestamptz;
      v_number_of_slots := (v_session ->> 'number_of_slots')::integer;
    exception when others then
      raise exception 'Invalid masterclass session' using errcode = '22023';
    end;

    if v_session_date is null
      or v_preferred_start_at is null
      or v_number_of_slots not between 1 and 3
      or (v_preferred_start_at at time zone 'Asia/Jakarta')::date <> v_session_date
      or (
        select count(*)
        from jsonb_array_elements(p_sessions) duplicate_session
        where duplicate_session ->> 'session_date' = v_session ->> 'session_date'
      ) > 1 then
      raise exception 'Invalid masterclass session' using errcode = '22023';
    end if;

    select value
    into v_window
    from jsonb_array_elements(v_schedule)
    where ((value ->> 'start_at')::timestamptz at time zone 'Asia/Jakarta')::date = v_session_date
      and (value ->> 'max_slots') ~ '^[0-9]+$'
    limit 1;

    if v_window is null then
      raise exception 'This date is not available for booking' using errcode = '22023';
    end if;

    v_window_start := (v_window ->> 'start_at')::timestamptz;
    v_window_end := (v_window ->> 'end_at')::timestamptz;
    v_max_slots := (v_window ->> 'max_slots')::integer;
    v_preferred_end_at := v_preferred_start_at + make_interval(mins => p_duration_minutes * v_number_of_slots);
    v_lunch_start := ((v_session_date + time '12:00') at time zone 'Asia/Jakarta');
    v_lunch_end := v_lunch_start + interval '1 hour';

    if v_max_slots <= 0
      or v_preferred_start_at < v_window_start
      or v_preferred_end_at > v_window_end
      or mod(extract(epoch from v_preferred_start_at - v_window_start)::integer / 60, 15) <> 0
      or tstzrange(v_preferred_start_at, v_preferred_end_at, '[)') && tstzrange(v_lunch_start, v_lunch_end, '[)') then
      raise exception 'The preferred time is no longer available' using errcode = '23P01';
    end if;

    select coalesce(sum(participant.number_of_slots), 0)
    into v_booked_slots
    from public.masterclass_participants participant
    where participant.event_id = p_event_id
      and coalesce(
        participant.session_date,
        (participant.preferred_start_at at time zone 'Asia/Jakarta')::date
      ) = v_session_date;

    if v_booked_slots + v_number_of_slots > v_max_slots
      or exists (
        select 1
        from public.masterclass_participants participant
        where participant.event_id = p_event_id
          and tstzrange(participant.preferred_start_at, participant.preferred_end_at, '[)')
              && tstzrange(v_preferred_start_at, v_preferred_end_at, '[)')
      ) then
      raise exception 'The preferred time is no longer available' using errcode = '23P01';
    end if;

    v_first_start_at := coalesce(v_first_start_at, v_preferred_start_at);
  end loop;

  insert into public.registrations (
    id, ref_code, event_id, registrant_status, registrant_name,
    registrant_whatsapp, registrant_email, participant_name, participant_age,
    selected_date, song_duration, bank_name, bank_account_number,
    bank_account_name, song_pdf_url, payment_receipt_url, status
  ) values (
    p_registration_id, p_ref_code, p_event_id, p_registrant_status,
    p_registrant_name, p_registrant_whatsapp, p_registrant_email,
    p_participant_name, p_participant_age, v_first_start_at,
    format('%s minutes', p_duration_minutes), p_bank_name,
    p_bank_account_number, p_bank_account_name, p_song_pdf_url,
    p_payment_receipt_url, 'pending'
  ) returning * into v_registration;

  for v_session in select value from jsonb_array_elements(p_sessions)
  loop
    v_session_date := (v_session ->> 'session_date')::date;
    v_preferred_start_at := (v_session ->> 'preferred_start_at')::timestamptz;
    v_number_of_slots := (v_session ->> 'number_of_slots')::integer;
    v_preferred_end_at := v_preferred_start_at + make_interval(mins => p_duration_minutes * v_number_of_slots);

    insert into public.masterclass_participants (
      event_id, registration_id, name, repertoire, duration, number_of_slots,
      session_date, preferred_start_at, preferred_end_at
    ) values (
      p_event_id, v_registration.id, p_participant_name, p_repertoire,
      p_duration_minutes, v_number_of_slots, v_session_date,
      v_preferred_start_at, v_preferred_end_at
    );
  end loop;

  registration_id := v_registration.id;
  registration_created_at := v_registration.created_at;
  return next;
end;
$$;

-- Holds are intentionally separate from registrations: an administrator can
-- reserve capacity for someone before they submit a public registration.
create function public.create_masterclass_hold(
  p_event_id uuid,
  p_session_date date,
  p_preferred_start_at timestamptz,
  p_duration_minutes integer,
  p_number_of_slots integer,
  p_hold_label text,
  p_hold_notes text default null
)
returns table (hold_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hold_id uuid;
  v_preferred_end_at timestamptz;
begin
  if coalesce(current_setting('request.headers', true)::jsonb ->> 'x-admin-role', '') <> 'admin' then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_hold_label, ''))) = 0 then
    raise exception 'A hold label is required' using errcode = '22023';
  end if;

  -- Serialise holds and registrations for this event before checking capacity.
  perform 1
  from public.events
  where id = p_event_id
    and type::text = 'masterclass'
  for update;

  if not found then
    raise exception 'Invalid masterclass event' using errcode = '22023';
  end if;

  select slot_end
  into v_preferred_end_at
  from public.get_masterclass_available_slots(
    p_event_id,
    p_session_date,
    p_duration_minutes,
    p_number_of_slots
  )
  where slot_start = p_preferred_start_at;

  if v_preferred_end_at is null then
    raise exception 'The selected time is no longer available' using errcode = '23P01';
  end if;

  insert into public.masterclass_participants (
    event_id, name, repertoire, duration, number_of_slots, session_date,
    preferred_start_at, preferred_end_at, is_hold, hold_label, hold_notes
  ) values (
    p_event_id, trim(p_hold_label), array[]::text[], p_duration_minutes,
    p_number_of_slots, p_session_date, p_preferred_start_at,
    v_preferred_end_at, true, trim(p_hold_label), nullif(trim(p_hold_notes), '')
  ) returning id into v_hold_id;

  hold_id := v_hold_id;
  return next;
end;
$$;

revoke all on function public.get_masterclass_available_slots(uuid, date, integer, integer) from public;
revoke all on function public.create_masterclass_registration(uuid, text, uuid, registrant_status, text, text, text, text, integer, integer, jsonb, text[], text, text, text, text[], text) from public;
revoke all on function public.create_masterclass_hold(uuid, date, timestamptz, integer, integer, text, text) from public;
grant execute on function public.get_masterclass_available_slots(uuid, date, integer, integer) to anon, authenticated;
grant execute on function public.create_masterclass_registration(uuid, text, uuid, registrant_status, text, text, text, text, integer, integer, jsonb, text[], text, text, text, text[], text) to anon, authenticated;
grant execute on function public.create_masterclass_hold(uuid, date, timestamptz, integer, integer, text, text) to anon, authenticated;
