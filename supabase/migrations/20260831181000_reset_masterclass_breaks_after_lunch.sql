-- Lunch is already a mandatory blocked period. Start a fresh break counter
-- when the afternoon block begins so morning slots do not consume the first
-- afternoon break allowance.
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
  v_lunch_start timestamptz;
  v_lunch_end timestamptz;
  v_afternoon_start timestamptz;
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

  v_lunch_start := ((p_session_date + time '12:00') at time zone 'Asia/Jakarta');
  v_lunch_end := v_lunch_start + interval '1 hour';

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

    -- Morning counter.
    v_break_start := v_window_start + make_interval(mins => p_duration_minutes * v_break_after_slots);
    while v_break_start < least(v_window_end, v_lunch_start) loop
      v_break_end := least(v_break_start + make_interval(mins => v_break_duration_minutes), v_window_end, v_lunch_start);
      if tstzrange(p_start_at, p_end_at, '[)') && tstzrange(v_break_start, v_break_end, '[)') then
        return true;
      end if;
      v_break_start := v_break_end + make_interval(mins => p_duration_minutes * v_break_after_slots);
    end loop;

    -- Afternoon counter starts again after lunch, or at the configured start
    -- when this is an afternoon-only date window.
    v_afternoon_start := greatest(v_window_start, v_lunch_end);
    v_break_start := v_afternoon_start + make_interval(mins => p_duration_minutes * v_break_after_slots);
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
