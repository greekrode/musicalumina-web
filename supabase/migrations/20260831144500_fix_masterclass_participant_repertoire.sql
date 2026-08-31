-- The first multi-date migration used a text array for a JSONB repertoire
-- column. Rebuild the deployed functions with the correctly typed values.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(p.oid)
  into function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_masterclass_registration';

  if function_definition is null
    or position('p_participant_name, p_repertoire,' in function_definition) = 0 then
    raise exception 'Unexpected create_masterclass_registration definition';
  end if;

  execute replace(
    function_definition,
    'p_participant_name, p_repertoire,',
    'p_participant_name, to_jsonb(p_repertoire),'
  );

  select pg_get_functiondef(p.oid)
  into function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_masterclass_hold';

  if function_definition is null
    or position('array[]::text[]' in function_definition) = 0 then
    raise exception 'Unexpected create_masterclass_hold definition';
  end if;

  execute replace(function_definition, 'array[]::text[]', '''[]''::jsonb');
end;
$$;
