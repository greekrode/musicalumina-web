-- Jury scores go through one RPC: it upserts the jury's own score and appends
-- the history row in the same transaction, derives category/event/participant
-- from the registration (never from the client), and is idempotent so the
-- scoring app's offline outbox can replay a submission after a lost response.
-- Jury lose direct write access to event_scoring and event_scoring_history;
-- admins keep theirs.
create or replace function public.submit_jury_score(
  p_registration_id uuid,
  p_final_score numeric,
  p_remarks text default null,
  p_jury_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jury text := auth.jwt() ->> 'sub';
  v_remarks text := nullif(btrim(coalesce(p_remarks, '')), '');
  v_jury_name text := left(nullif(btrim(coalesce(p_jury_name, '')), ''), 255);
  v_reg record;
  v_before public.event_scoring;
  v_after public.event_scoring;
begin
  if not public.is_jury() or v_jury is null then
    return jsonb_build_object('error', 'forbidden');
  end if;
  if p_final_score is null or p_final_score <= 0 or p_final_score > 100
     or p_final_score <> round(p_final_score, 1) then
    return jsonb_build_object('error', 'invalid_score');
  end if;
  if length(coalesce(v_remarks, '')) > 2000 then
    return jsonb_build_object('error', 'invalid_remarks');
  end if;

  select r.id, r.event_id, r.category_id, r.subcategory_id, r.participant_name
    into v_reg
    from public.registrations r
   where r.id = p_registration_id;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  select * into v_before
    from public.event_scoring
   where registration_id = p_registration_id and jury_id = v_jury
     for update;

  if v_before.id is not null then
    if coalesce(v_before.finalized, false) then
      return jsonb_build_object('error', 'finalized');
    end if;
    -- Replay of a submission that already landed: no new history row.
    if v_before.final_score = p_final_score and v_before.remarks is not distinct from v_remarks then
      return jsonb_build_object('status', 'unchanged', 'id', v_before.id, 'updatedAt', v_before.updated_at);
    end if;
    update public.event_scoring
       set final_score = p_final_score,
           remarks = v_remarks,
           jury_name = coalesce(v_jury_name, jury_name),
           updated_at = now()
     where id = v_before.id
    returning * into v_after;
  else
    insert into public.event_scoring
      (registration_id, category_id, subcategory_id, jury_id, jury_name, final_score, remarks, finalized)
    values
      (v_reg.id, v_reg.category_id, v_reg.subcategory_id, v_jury, v_jury_name, p_final_score, v_remarks, false)
    returning * into v_after;
  end if;

  insert into public.event_scoring_history
    (table_name, record_id, operation, before_data, after_data, changed_by, jury_name,
     event_id, registration_id, participant_name, category_id, subcategory_id)
  values
    ('event_scoring', v_after.id, case when v_before.id is null then 'INSERT' else 'UPDATE' end,
     case when v_before.id is null then null else to_jsonb(v_before) end, to_jsonb(v_after),
     v_jury, v_after.jury_name, v_reg.event_id, v_reg.id, left(v_reg.participant_name, 255),
     v_reg.category_id, v_reg.subcategory_id);

  return jsonb_build_object(
    'status', case when v_before.id is null then 'created' else 'updated' end,
    'id', v_after.id,
    'updatedAt', v_after.updated_at);
end;
$$;

revoke all on function public.submit_jury_score(uuid, numeric, text, text) from public, anon;
grant execute on function public.submit_jury_score(uuid, numeric, text, text) to authenticated;

drop policy if exists "Jury adds own scores" on public.event_scoring;
drop policy if exists "Jury edits own unfinalized scores" on public.event_scoring;
drop policy if exists "Jury appends history for own scores" on public.event_scoring_history;
