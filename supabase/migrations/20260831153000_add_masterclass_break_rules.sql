-- Each masterclass date may optionally specify a repeating break: after N
-- session slots, reserve M minutes before the next block begins.
create or replace function public.masterclass_slot_overlaps_configured_break(
  p_event_id uuid,
  p_session_date date,
  p_duration_minutes integer,
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_schedule jsonb;
  v_window jsonb;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_break_after_slots integer;
  v_break_duration_minutes integer;
  v_break_start timestamptz;
  v_break_end timestamptz;
begin
  if p_duration_minutes <= 0 or p_start_at is null or p_end_at is null then
    return false;
  end if;

  select event_schedule into v_schedule from public.events where id = p_event_id;
  if v_schedule is null then
    return false;
  end if;

  for v_window in select value from jsonb_array_elements(v_schedule)
  loop
    begin
      v_window_start := (v_window ->> 'start_at')::timestamptz;
      v_window_end := (v_window ->> 'end_at')::timestamptz;
      v_break_after_slots := coalesce(nullif(v_window ->> 'break_after_slots', '')::integer, 0);
      v_break_duration_minutes := coalesce(nullif(v_window ->> 'break_duration_minutes', '')::integer, 0);
    exception when others then
      continue;
    end;

    if (v_window_start at time zone 'Asia/Jakarta')::date <> p_session_date
      or v_break_after_slots <= 0
      or v_break_duration_minutes <= 0 then
      continue;
    end if;

    v_break_start := v_window_start + make_interval(mins => p_duration_minutes * v_break_after_slots);
    while v_break_start < v_window_end loop
      v_break_end := least(v_break_start + make_interval(mins => v_break_duration_minutes), v_window_end);
      if tstzrange(p_start_at, p_end_at, '[)') && tstzrange(v_break_start, v_break_end, '[)') then
        return true;
      end if;
      v_break_start := v_break_end + make_interval(mins => p_duration_minutes * v_break_after_slots);
    end loop;
  end loop;

  return false;
end;
$$;

-- Rebuild availability so break periods are never offered as preferred times.
do $$
declare
  function_definition text;
  original_check text := $check$if tstzrange(v_candidate_start, v_candidate_end, '[)')
          && tstzrange(v_lunch_start, v_lunch_end, '[)') then
        continue;$check$;
  replacement_check text := $check$if tstzrange(v_candidate_start, v_candidate_end, '[)')
          && tstzrange(v_lunch_start, v_lunch_end, '[)')
          or public.masterclass_slot_overlaps_configured_break(
            p_event_id, p_session_date, p_duration_minutes, v_candidate_start, v_candidate_end
          ) then
        continue;$check$;
begin
  select pg_get_functiondef(p.oid) into function_definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_masterclass_available_slots';

  if function_definition is null or position(original_check in function_definition) = 0 then
    raise exception 'Unexpected get_masterclass_available_slots definition';
  end if;
  execute replace(function_definition, original_check, replacement_check);
end;
$$;

-- Registrations and admin holds share this last-line guard, even if they are
-- created by a caller that bypasses the availability UI.
create or replace function public.enforce_masterclass_configured_break()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.event_id is not null
    and new.session_date is not null
    and new.preferred_start_at is not null
    and new.preferred_end_at is not null
    and public.masterclass_slot_overlaps_configured_break(
      new.event_id, new.session_date, new.duration, new.preferred_start_at, new.preferred_end_at
    ) then
    raise exception 'This time falls within a configured masterclass break' using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists masterclass_participants_enforce_break on public.masterclass_participants;
create trigger masterclass_participants_enforce_break
before insert or update of event_id, session_date, duration, preferred_start_at, preferred_end_at
on public.masterclass_participants
for each row execute function public.enforce_masterclass_configured_break();
