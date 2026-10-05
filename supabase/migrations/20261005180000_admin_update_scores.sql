-- Admin score adjustments go through one RPC so every change is validated
-- like a jury submission (0 < score <= 100, one decimal) and lands in
-- event_scoring_history in the same transaction. History's jury_name/changed_by
-- name who made the change (the admin); after_data keeps the score's own
-- jury_name and carries edited_by_admin so History can show an adjustment.
-- p_updates: [{"id": "<event_scoring.id>", "final_score": 88.5}, ...]
create or replace function public.admin_update_scores(
  p_updates jsonb,
  p_admin_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin text := auth.jwt() ->> 'sub';
  v_admin_name text := left(coalesce(nullif(btrim(coalesce(p_admin_name, '')), ''), 'Admin'), 200);
  v_item jsonb;
  v_score numeric;
  v_before public.event_scoring;
  v_after public.event_scoring;
  v_reg record;
  v_changed int := 0;
begin
  if not public.is_admin() or v_admin is null then
    return jsonb_build_object('error', 'forbidden');
  end if;
  if jsonb_typeof(p_updates) <> 'array' or jsonb_array_length(p_updates) = 0 or jsonb_array_length(p_updates) > 50 then
    return jsonb_build_object('error', 'invalid_request');
  end if;

  -- Validate everything first so a bad entry changes nothing.
  for v_item in select * from jsonb_array_elements(p_updates) loop
    begin
      v_score := (v_item ->> 'final_score')::numeric;
      perform (v_item ->> 'id')::uuid;
    exception when others then
      return jsonb_build_object('error', 'invalid_request');
    end;
    if v_score is null or v_score <= 0 or v_score > 100 or v_score <> round(v_score, 1) then
      return jsonb_build_object('error', 'invalid_score');
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(p_updates) loop
    v_score := (v_item ->> 'final_score')::numeric;
    select * into v_before from public.event_scoring where id = (v_item ->> 'id')::uuid for update;
    if v_before.id is null then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    continue when v_before.final_score = v_score;

    update public.event_scoring set final_score = v_score, updated_at = now()
     where id = v_before.id
    returning * into v_after;

    select r.event_id, r.participant_name into v_reg from public.registrations r where r.id = v_after.registration_id;

    insert into public.event_scoring_history
      (table_name, record_id, operation, before_data, after_data, changed_by, jury_name,
       event_id, registration_id, participant_name, category_id, subcategory_id)
    values
      ('event_scoring', v_after.id, 'UPDATE', to_jsonb(v_before),
       to_jsonb(v_after) || jsonb_build_object('edited_by_admin', v_admin_name),
       v_admin, v_admin_name, v_reg.event_id, v_after.registration_id,
       left(v_reg.participant_name, 255), v_after.category_id, v_after.subcategory_id);
    v_changed := v_changed + 1;
  end loop;

  return jsonb_build_object('status', 'ok', 'changed', v_changed);
end;
$$;

revoke all on function public.admin_update_scores(jsonb, text) from public, anon;
grant execute on function public.admin_update_scores(jsonb, text) to authenticated;
