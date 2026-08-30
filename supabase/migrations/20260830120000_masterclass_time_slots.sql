-- Masterclass schedule windows and atomic time-slot booking.
-- event_date remains the legacy list of start times used by the public event pages.
-- event_schedule is the authoritative start/end availability for booking.

create extension if not exists btree_gist;

alter table public.events
  add column if not exists event_schedule jsonb;

alter table public.masterclass_participants
  add column if not exists registration_id uuid references public.registrations(id) on delete cascade,
  add column if not exists preferred_start_at timestamptz,
  add column if not exists preferred_end_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'masterclass_participants_preferred_time_check'
  ) then
    alter table public.masterclass_participants
      add constraint masterclass_participants_preferred_time_check
      check (
        (preferred_start_at is null and preferred_end_at is null)
        or preferred_end_at > preferred_start_at
      );
  end if;
end $$;

create unique index if not exists masterclass_participants_registration_id_key
  on public.masterclass_participants (registration_id)
  where registration_id is not null;

create index if not exists masterclass_participants_event_time_idx
  on public.masterclass_participants (event_id, preferred_start_at);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'masterclass_participants_no_overlapping_times'
  ) then
    alter table public.masterclass_participants
      add constraint masterclass_participants_no_overlapping_times
      exclude using gist (
        event_id with =,
        tstzrange(preferred_start_at, preferred_end_at, '[)') with &&
      )
      where (preferred_start_at is not null and preferred_end_at is not null);
  end if;
end $$;

create or replace function public.get_masterclass_available_slots(
  p_event_id uuid,
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
begin
  if p_duration_minutes <= 0 or p_number_of_slots not between 1 and 3 then
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
    exception when others then
      continue;
    end;

    if v_window_end <= v_window_start then
      continue;
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

create or replace function public.create_masterclass_registration(
  p_registration_id uuid,
  p_ref_code text,
  p_event_id uuid,
  p_registrant_status registrant_status,
  p_registrant_name text,
  p_registrant_whatsapp text,
  p_registrant_email text,
  p_participant_name text,
  p_participant_age integer,
  p_preferred_start_at timestamptz,
  p_duration_minutes integer,
  p_number_of_slots integer,
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
  v_preferred_end_at timestamptz;
begin
  if p_participant_name is null or length(trim(p_participant_name)) < 3
    or p_participant_age not between 1 and 100
    or p_registrant_whatsapp is null or p_registrant_email is null
    or p_bank_name is null or p_bank_account_number is null or p_bank_account_name is null
    or p_payment_receipt_url is null
    or coalesce(cardinality(p_repertoire), 0) = 0 then
    raise exception 'Invalid masterclass registration' using errcode = '22023';
  end if;

  select slot_end
  into v_preferred_end_at
  from public.get_masterclass_available_slots(
    p_event_id,
    p_duration_minutes,
    p_number_of_slots
  )
  where slot_start = p_preferred_start_at;

  if v_preferred_end_at is null then
    raise exception 'The preferred time is no longer available' using errcode = '23P01';
  end if;

  insert into public.registrations (
    id,
    ref_code,
    event_id,
    registrant_status,
    registrant_name,
    registrant_whatsapp,
    registrant_email,
    participant_name,
    participant_age,
    selected_date,
    song_duration,
    bank_name,
    bank_account_number,
    bank_account_name,
    song_pdf_url,
    payment_receipt_url,
    status
  ) values (
    p_registration_id,
    p_ref_code,
    p_event_id,
    p_registrant_status,
    p_registrant_name,
    p_registrant_whatsapp,
    p_registrant_email,
    p_participant_name,
    p_participant_age,
    p_preferred_start_at,
    format('%s minutes', p_duration_minutes),
    p_bank_name,
    p_bank_account_number,
    p_bank_account_name,
    p_song_pdf_url,
    p_payment_receipt_url,
    'pending'
  )
  returning * into v_registration;

  insert into public.masterclass_participants (
    event_id,
    registration_id,
    name,
    repertoire,
    duration,
    number_of_slots,
    preferred_start_at,
    preferred_end_at
  ) values (
    p_event_id,
    v_registration.id,
    p_participant_name,
    p_repertoire,
    p_duration_minutes,
    p_number_of_slots,
    p_preferred_start_at,
    v_preferred_end_at
  );

  registration_id := v_registration.id;
  registration_created_at := v_registration.created_at;
  return next;
exception
  when exclusion_violation then
    raise exception 'The preferred time is no longer available' using errcode = '23P01';
end;
$$;

revoke all on function public.get_masterclass_available_slots(uuid, integer, integer) from public;
revoke all on function public.create_masterclass_registration(uuid, text, uuid, registrant_status, text, text, text, text, integer, timestamptz, integer, integer, text[], text, text, text, text[], text) from public;
grant execute on function public.get_masterclass_available_slots(uuid, integer, integer) to anon, authenticated;
grant execute on function public.create_masterclass_registration(uuid, text, uuid, registrant_status, text, text, text, text, integer, timestamptz, integer, integer, text[], text, text, text, text[], text) to anon, authenticated;
