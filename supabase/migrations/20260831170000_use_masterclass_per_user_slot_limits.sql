-- `max_slots` was initially interpreted as a date-wide capacity. It now
-- represents a per-registrant limit through the explicit `max_user_slots`
-- schedule key. Existing schedules fall back to three slots per registrant.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(p.oid) into function_definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_masterclass_available_slots';

  if function_definition is null
    or position('p_number_of_slots not between 1 and 3' in function_definition) = 0 then
    raise exception 'Unexpected get_masterclass_available_slots definition';
  end if;

  function_definition := replace(function_definition, 'p_number_of_slots not between 1 and 3', 'p_number_of_slots <= 0');
  function_definition := replace(function_definition, '(v_window ->> ''max_slots'')::integer', 'coalesce(nullif(v_window ->> ''max_user_slots'', '''')::integer, 3)');
  function_definition := replace(function_definition, 'v_booked_slots + p_number_of_slots > v_max_slots', 'p_number_of_slots > v_max_slots');
  execute function_definition;

  select pg_get_functiondef(p.oid) into function_definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_masterclass_registration';

  if function_definition is null
    or position('v_number_of_slots not between 1 and 3' in function_definition) = 0 then
    raise exception 'Unexpected create_masterclass_registration definition';
  end if;

  function_definition := replace(function_definition, 'v_number_of_slots not between 1 and 3', 'v_number_of_slots <= 0');
  function_definition := replace(function_definition, E'      and (value ->> ''max_slots'') ~ ''^[0-9]+$''\n', '');
  function_definition := replace(function_definition, '(v_window ->> ''max_slots'')::integer', 'coalesce(nullif(v_window ->> ''max_user_slots'', '''')::integer, 3)');
  function_definition := replace(function_definition, 'v_booked_slots + v_number_of_slots > v_max_slots', 'v_number_of_slots > v_max_slots');
  execute function_definition;
end;
$$;
