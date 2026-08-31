-- Remove the now-unused fixed-lunch variables and assignments so every
-- unavailable period comes exclusively from event_schedule configuration.
do $$
declare
  function_definition text;
  availability_assignment text := $old$v_lunch_start := (
        ((v_candidate_start at time zone 'Asia/Jakarta')::date + time '12:00')
        at time zone 'Asia/Jakarta'
      );
      v_lunch_end := v_lunch_start + interval '1 hour';

      $old$;
  registration_assignment text := $old$v_lunch_start := ((v_session_date + time '12:00') at time zone 'Asia/Jakarta');
    v_lunch_end := v_lunch_start + interval '1 hour';

    $old$;
begin
  select pg_get_functiondef(p.oid) into function_definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_masterclass_available_slots';
  if function_definition is null or position(availability_assignment in function_definition) = 0 then
    raise exception 'Unexpected get_masterclass_available_slots definition';
  end if;
  function_definition := replace(function_definition, E'  v_lunch_start timestamptz;\n  v_lunch_end timestamptz;\n', '');
  execute replace(function_definition, availability_assignment, '');

  select pg_get_functiondef(p.oid) into function_definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_masterclass_registration';
  if function_definition is null or position(registration_assignment in function_definition) = 0 then
    raise exception 'Unexpected create_masterclass_registration definition';
  end if;
  function_definition := replace(function_definition, E'  v_lunch_start timestamptz;\n  v_lunch_end timestamptz;\n', '');
  execute replace(function_definition, registration_assignment, '');
end;
$$;
