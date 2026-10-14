-- Walk-in teacher entry pass: after a successful submit the teacher-walkin
-- Edge Function signs a customer pass (kind 4: customers.id + events.id) and
-- the page shows it as a QR that the door scans with the QR scanner.
--
-- submit_teacher_walkin now returns the ids and the pass expiry. The scanner
-- (check_in_customer_pass) also admits customers who submitted the walk-in
-- form for that event, even if their customers.type is not teacher (a match
-- by WhatsApp/email keeps the existing row and type as they are).

create or replace function public.submit_teacher_walkin(
  p_token_hash text,
  p_name text,
  p_email text,
  p_whatsapp text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link record;
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_whatsapp text := normalize_whatsapp(p_whatsapp);
  v_customer uuid;
  v_new boolean := false;
  v_last_day date;
  v_pass_expires timestamptz;
begin
  select * into link from teacher_walkin_links where token_hash = p_token_hash for update;
  if not found then
    return jsonb_build_object('error', 'invalid_link');
  end if;
  if link.used_at is not null then
    return jsonb_build_object('error', 'link_used');
  end if;
  if link.expires_at < now() then
    return jsonb_build_object('error', 'link_expired');
  end if;
  if not ((now() at time zone 'Asia/Jakarta')::date = any(event_days_jakarta(link.event_id)))
     and not (link.is_test and exists (
       select 1 from teacher_walkin_gates g where g.event_id = link.event_id and g.test_until > now()
     )) then
    return jsonb_build_object('error', 'not_event_day');
  end if;

  if char_length(v_name) not between 2 and 120
     or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or char_length(v_whatsapp) not between 8 and 15 then
    return jsonb_build_object('error', 'invalid_input');
  end if;

  -- One submission at a time, so two links for the same teacher can't both insert.
  perform pg_advisory_xact_lock(hashtext('submit_teacher_walkin'));

  select id into v_customer
    from customers
   where normalize_whatsapp(whatsapp) = v_whatsapp
      or lower(btrim(email)) = v_email
   order by created_at
   limit 1;

  if v_customer is null then
    insert into customers (name, whatsapp, email, type)
    values (v_name, v_whatsapp, v_email, 'teacher')
    returning id into v_customer;
    v_new := true;
  end if;

  update teacher_walkin_links
     set used_at = now(), customer_id = v_customer, new_customer = v_new
   where id = link.id;

  -- The pass lasts until the end of the event's last day (WIB), and at least
  -- 12 hours, so a test-mode pass can still be scanned.
  select max(d) into v_last_day from unnest(event_days_jakarta(link.event_id)) d;
  v_pass_expires := greatest(
    coalesce(((v_last_day + 1)::timestamp at time zone 'Asia/Jakarta'), now()),
    now() + interval '12 hours'
  );

  return jsonb_build_object(
    'ok', true,
    'customerId', v_customer,
    'eventId', link.event_id,
    'passExpiresAt', floor(extract(epoch from v_pass_expires))::bigint
  );
end;
$$;

create or replace function public.check_in_customer_pass(
  p_customer_id uuid,
  p_event_id uuid,
  p_checked_in_by text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cust record;
  ev record;
  checkin record;
  inserted boolean;
  today date := (now() at time zone 'Asia/Jakarta')::date;
  event_days date[];
begin
  select id, name, type into cust from customers where id = p_customer_id;
  if not found
     or (coalesce(cust.type, '') not in ('teacher', 'music school/institution')
         and not exists (
           select 1 from teacher_walkin_links l
            where l.customer_id = p_customer_id and l.event_id = p_event_id and l.used_at is not null
         )) then
    return jsonb_build_object('error', 'not_eligible');
  end if;
  select id, event_date, start_date into ev from events where id = p_event_id;
  if not found then
    return jsonb_build_object('error', 'not_eligible');
  end if;

  select coalesce(array_agg(distinct ((d::timestamptz) at time zone 'Asia/Jakarta')::date order by ((d::timestamptz) at time zone 'Asia/Jakarta')::date), '{}')
    into event_days
    from jsonb_array_elements_text(case when jsonb_typeof(ev.event_date) = 'array' then ev.event_date else '[]'::jsonb end) d;
  if cardinality(event_days) = 0 and ev.start_date is not null then
    event_days := array[(ev.start_date at time zone 'Asia/Jakarta')::date];
  end if;

  if today = any(event_days) then
    insert into customer_checkins (customer_id, event_id, checked_in_by)
    values (p_customer_id, p_event_id, p_checked_in_by)
    on conflict (customer_id, event_id) do nothing
    returning checked_in_at, checked_in_by into checkin;
    inserted := found;
  else
    inserted := false;
  end if;

  if not inserted then
    select checked_in_at, checked_in_by into checkin
      from customer_checkins
     where customer_id = p_customer_id and event_id = p_event_id;
  end if;

  -- Same shape as check_in_pass so the scanner renders it as a teacher pass.
  return jsonb_build_object(
    'status', case
      when not (today = any(event_days)) then 'test'
      when inserted then 'checked_in'
      else 'already_checked_in' end,
    'kind', 'teacher',
    'verified', true,
    'checkedInAt', checkin.checked_in_at,
    'checkedInBy', checkin.checked_in_by,
    'eventDays', to_jsonb(event_days),
    'registration', jsonb_build_object(
      'id', cust.id,
      'refCode', null,
      'eventId', ev.id,
      'name', cust.name,
      'entryName', null,
      'songTitle', null,
      'categoryName', null,
      'subCategoryName', null,
      'registrationStatus', null
    )
  );
end;
$$;
