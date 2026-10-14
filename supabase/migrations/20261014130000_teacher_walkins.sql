-- Walk-in teachers: teachers who did not register come to an event and watch
-- for free. A printed QR (admin → Teacher Walk-in) opens
-- /teacher-walkin/<event id>. The page proves the visitor is at the venue
-- (browser location inside the gate's radius) on one of the event's days, and
-- the teacher-walkin Edge Function then mints a single-use link for the form.
-- Submitting it adds the teacher to customers unless they are already there
-- (same WhatsApp number or email); either way the visitor only sees success.
--
-- Only the Edge Function (service role) calls the RPCs below. Admins manage
-- the gate; staff can read gates and submissions.

create table if not exists public.teacher_walkin_gates (
  event_id uuid primary key references public.events(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_m integer not null default 300 check (radius_m between 50 and 5000),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.teacher_walkin_gates is
  'Venue geofence for the walk-in teacher QR of one event. No row or enabled = false: the form is closed.';

alter table public.teacher_walkin_gates enable row level security;
revoke all on table public.teacher_walkin_gates from anon, public;
grant select, insert, update, delete on table public.teacher_walkin_gates to authenticated;

drop policy if exists "Staff read teacher walk-in gates" on public.teacher_walkin_gates;
create policy "Staff read teacher walk-in gates" on public.teacher_walkin_gates
  for select to authenticated using (public.can_view_admin());
drop policy if exists "Admins manage teacher walk-in gates" on public.teacher_walkin_gates;
create policy "Admins manage teacher walk-in gates" on public.teacher_walkin_gates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.teacher_walkin_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  -- SHA-256 (hex) of the link token; the token itself is never stored.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  client_ip text not null,
  distance_m integer not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  customer_id uuid references public.customers(id) on delete set null,
  -- true: the submission created the customer; false: they already existed.
  new_customer boolean,
  constraint teacher_walkin_links_used check ((used_at is null) = (new_customer is null))
);

create index if not exists teacher_walkin_links_event_idx
  on public.teacher_walkin_links (event_id, used_at desc);

comment on table public.teacher_walkin_links is
  'Single-use walk-in teacher form links, written only by open_teacher_walkin / submit_teacher_walkin.';

alter table public.teacher_walkin_links enable row level security;
revoke all on table public.teacher_walkin_links from anon, authenticated, public;
grant select on table public.teacher_walkin_links to authenticated;

drop policy if exists "Staff read teacher walk-in links" on public.teacher_walkin_links;
create policy "Staff read teacher walk-in links" on public.teacher_walkin_links
  for select to authenticated using (public.can_view_admin());

-- WhatsApp numbers are stored as typed; compare them as Indonesian E.164
-- digits so 0812…, +62 812… and 62812… are the same number.
create or replace function public.normalize_whatsapp(p_number text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when d like '0%' then '62' || substr(d, 2)
    when d like '8%' then '62' || d
    else d
  end
  from (select regexp_replace(coalesce(p_number, ''), '\D', '', 'g') as d) s;
$$;

-- The event's days in Jakarta: event_date (array of timestamps), else start_date.
create or replace function public.event_days_jakarta(p_event_id uuid)
returns date[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ev record;
  days date[];
begin
  select event_date, start_date into ev from events where id = p_event_id;
  if not found then
    return '{}';
  end if;
  select coalesce(array_agg(distinct ((d::timestamptz) at time zone 'Asia/Jakarta')::date), '{}')
    into days
    from jsonb_array_elements_text(case when jsonb_typeof(ev.event_date) = 'array' then ev.event_date else '[]'::jsonb end) d;
  if cardinality(days) = 0 and ev.start_date is not null then
    days := array[(ev.start_date at time zone 'Asia/Jakarta')::date];
  end if;
  return days;
end;
$$;

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
begin
  select latitude, longitude, radius_m, enabled
    into gate
    from teacher_walkin_gates
   where event_id = p_event_id;
  if not found or not gate.enabled then
    return jsonb_build_object('error', 'closed');
  end if;

  if not ((now() at time zone 'Asia/Jakarta')::date = any(event_days_jakarta(p_event_id))) then
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

  insert into teacher_walkin_links (event_id, token_hash, client_ip, distance_m, expires_at)
  values (p_event_id, p_token_hash, left(p_client_ip, 100), round(v_distance)::integer, v_expires);

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
  if not ((now() at time zone 'Asia/Jakarta')::date = any(event_days_jakarta(link.event_id))) then
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

revoke all on function public.event_days_jakarta(uuid) from public, anon, authenticated;
revoke all on function public.open_teacher_walkin(uuid, double precision, double precision, double precision, text, text) from public, anon, authenticated;
revoke all on function public.submit_teacher_walkin(text, text, text, text) from public, anon, authenticated;
grant execute on function public.event_days_jakarta(uuid) to service_role;
grant execute on function public.open_teacher_walkin(uuid, double precision, double precision, double precision, text, text) to service_role;
grant execute on function public.submit_teacher_walkin(text, text, text, text) to service_role;
