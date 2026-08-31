-- A missing or JSON null max_user_slots value means the registrant may choose
-- any positive number of slots that still fits inside the date's time window.
do $$
declare
  function_definition text;
  limited_expression text := 'coalesce(nullif(v_window ->> ''max_user_slots'', '''')::integer, 3)';
  unlimited_expression text := 'nullif(v_window ->> ''max_user_slots'', '''')::integer';
begin
  select pg_get_functiondef(p.oid) into function_definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_masterclass_available_slots';

  if function_definition is null or position(limited_expression in function_definition) = 0 then
    raise exception 'Unexpected get_masterclass_available_slots definition';
  end if;
  execute replace(function_definition, limited_expression, unlimited_expression);

  select pg_get_functiondef(p.oid) into function_definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_masterclass_registration';

  if function_definition is null or position(limited_expression in function_definition) = 0 then
    raise exception 'Unexpected create_masterclass_registration definition';
  end if;
  execute replace(function_definition, limited_expression, unlimited_expression);
end;
$$;
