-- Walk-in teacher test mode: until teacher_walkin_gates.test_until, the form
-- also opens outside the event's days so admins can try the real flow ahead
-- of time (the venue radius still applies). Links opened that way are
-- is_test, and stop working as soon as the test window ends.
alter table public.teacher_walkin_gates add column if not exists test_until timestamptz;
alter table public.teacher_walkin_links add column if not exists is_test boolean not null default false;

comment on column public.teacher_walkin_gates.test_until is
  'Admin test window: before this time the form also opens outside the event days.';
comment on column public.teacher_walkin_links.is_test is
  'Opened outside the event days during a test window.';

create or replace function public.open_teacher_walkin(
  p_event_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision,
  p_token_hash text,
  p_client_ip text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  gate record;
  v_distance double precision;
  v_expires timestamptz := now() + interval '20 minutes';
  v_test boolean;
begin
  select latitude, longitude, radius_m, enabled, test_until
    into gate
    from teacher_walkin_gates
   where event_id = p_event_id;
  if not found or not gate.enabled then
    return jsonb_build_object('error', 'closed');
  end if;

  v_test := not ((now() at time zone 'Asia/Jakarta')::date = any(event_days_jakarta(p_event_id)));
  if v_test and not coalesce(gate.test_until > now(), false) then
    return jsonb_build_object('error', 'not_event_day');
  end if;

  -- Haversine distance in metres.
  v_distance := 2 * 6371000 * asin(sqrt(
    power(sin(radians(p_latitude - gate.latitude) / 2), 2)
    + cos(radians(gate.latitude)) * cos(radians(p_latitude))
      * power(sin(radians(p_longitude - gate.longitude) / 2), 2)
  ));
  -- Indoor fixes drift, so allow the reported accuracy, but at most 150 m:
  -- a coarse (IP / Wi-Fi) fix far away must not pass.
  if v_distance > gate.radius_m + least(greatest(coalesce(p_accuracy_m, 0), 0), 150) then
    return jsonb_build_object('error', 'too_far');
  end if;

  insert into teacher_walkin_links (event_id, token_hash, client_ip, distance_m, expires_at, is_test)
  values (p_event_id, p_token_hash, left(p_client_ip, 100), round(v_distance)::integer, v_expires, v_test);

  return jsonb_build_object('ok', true, 'expiresAt', v_expires);
end;
$$;

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

  return jsonb_build_object('ok', true);
end;
$$;
