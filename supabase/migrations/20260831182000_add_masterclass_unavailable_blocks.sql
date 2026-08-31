-- Masterclass unavailable periods are configured per date inside
-- events.event_schedule[].unavailable_blocks. There is no implicit lunch.
create or replace function public.masterclass_slot_overlaps_unavailable_block(
  p_event_id uuid,
  p_session_date date,
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
  v_block jsonb;
  v_block_start timestamptz;
  v_block_end timestamptz;
begin
  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    return false;
  end if;

  select event_schedule into v_schedule from public.events where id = p_event_id;
  if v_schedule is null then
    return false;
  end if;

  for v_window in select value from jsonb_array_elements(v_schedule)
  loop
    if ((v_window ->> 'start_at')::timestamptz at time zone 'Asia/Jakarta')::date <> p_session_date then
      continue;
    end if;
    for v_block in select value from jsonb_array_elements(coalesce(v_window -> 'unavailable_blocks', '[]'::jsonb))
    loop
      begin
        v_block_start := (v_block ->> 'start_at')::timestamptz;
        v_block_end := (v_block ->> 'end_at')::timestamptz;
      exception when others then
        continue;
      end;
      if v_block_end > v_block_start
        and tstzrange(p_start_at, p_end_at, '[)') && tstzrange(v_block_start, v_block_end, '[)') then
        return true;
      end if;
    end loop;
  end loop;
  return false;
end;
$$;

-- Repeating break rules restart after every unavailable block, so each
-- available segment of the day has its own session counter.
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
  v_block jsonb;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_block_start timestamptz;
  v_block_end timestamptz;
  v_segment_start timestamptz;
  v_segment_end timestamptz;
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

    v_segment_start := v_window_start;
    for v_block in
      select value
      from jsonb_array_elements(coalesce(v_window -> 'unavailable_blocks', '[]'::jsonb))
      order by value ->> 'start_at'
    loop
      begin
        v_block_start := (v_block ->> 'start_at')::timestamptz;
        v_block_end := (v_block ->> 'end_at')::timestamptz;
      exception when others then
        continue;
      end;
      if v_block_end <= v_block_start or v_block_end <= v_window_start or v_block_start >= v_window_end then
        continue;
      end if;

      v_segment_end := least(v_window_end, v_block_start);
      if v_segment_end > v_segment_start then
        v_break_start := v_segment_start + make_interval(mins => p_duration_minutes * v_break_after_slots);
        while v_break_start < v_segment_end loop
          v_break_end := least(v_break_start + make_interval(mins => v_break_duration_minutes), v_segment_end);
          if tstzrange(p_start_at, p_end_at, '[)') && tstzrange(v_break_start, v_break_end, '[)') then
            return true;
          end if;
          v_break_start := v_break_end + make_interval(mins => p_duration_minutes * v_break_after_slots);
        end loop;
      end if;
      v_segment_start := greatest(v_segment_start, v_block_end);
      exit when v_segment_start >= v_window_end;
    end loop;

    if v_segment_start < v_window_end then
      v_break_start := v_segment_start + make_interval(mins => p_duration_minutes * v_break_after_slots);
      while v_break_start < v_window_end loop
        v_break_end := least(v_break_start + make_interval(mins => v_break_duration_minutes), v_window_end);
        if tstzrange(p_start_at, p_end_at, '[)') && tstzrange(v_break_start, v_break_end, '[)') then
          return true;
        end if;
        v_break_start := v_break_end + make_interval(mins => p_duration_minutes * v_break_after_slots);
      end loop;
    end if;
  end loop;
  return false;
end;
$$;

-- Replace the hardcoded 12:00-13:00 check in public availability.
do $$
declare
  function_definition text;
  old_candidate_check text := $old$if tstzrange(v_candidate_start, v_candidate_end, '[)')
          && tstzrange(v_lunch_start, v_lunch_end, '[)')
          or public.masterclass_slot_overlaps_configured_break(
            p_event_id, p_session_date, p_duration_minutes, v_candidate_start, v_candidate_end
          ) then$old$;
  new_candidate_check text := $new$if public.masterclass_slot_overlaps_unavailable_block(
            p_event_id, p_session_date, v_candidate_start, v_candidate_end
          ) or public.masterclass_slot_overlaps_configured_break(
            p_event_id, p_session_date, p_duration_minutes, v_candidate_start, v_candidate_end
          ) then$new$;
  old_registration_check text := $old$or tstzrange(v_preferred_start_at, v_preferred_end_at, '[)') && tstzrange(v_lunch_start, v_lunch_end, '[)')$old$;
  new_registration_check text := $new$or public.masterclass_slot_overlaps_unavailable_block(
        p_event_id, v_session_date, v_preferred_start_at, v_preferred_end_at
      )$new$;
begin
  select pg_get_functiondef(p.oid) into function_definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_masterclass_available_slots';

  if function_definition is null or position(old_candidate_check in function_definition) = 0 then
    raise exception 'Unexpected get_masterclass_available_slots definition';
  end if;
  execute replace(function_definition, old_candidate_check, new_candidate_check);

  select pg_get_functiondef(p.oid) into function_definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_masterclass_registration';

  if function_definition is null or position(old_registration_check in function_definition) = 0 then
    raise exception 'Unexpected create_masterclass_registration definition';
  end if;
  execute replace(function_definition, old_registration_check, new_registration_check);
end;
$$;

-- Enforce custom blocks for every participant write, including admin holds.
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
    and new.preferred_end_at is not null then
    if public.masterclass_slot_overlaps_unavailable_block(
      new.event_id, new.session_date, new.preferred_start_at, new.preferred_end_at
    ) then
      raise exception 'This time falls within a configured unavailable period' using errcode = '23P01';
    end if;
    if public.masterclass_slot_overlaps_configured_break(
      new.event_id, new.session_date, new.duration, new.preferred_start_at, new.preferred_end_at
    ) then
      raise exception 'This time falls within a configured masterclass break' using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;
