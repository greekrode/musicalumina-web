-- Audience tickets sold at the check-in desk, per festival session.
--
-- A session seats events.session_seat_limit people (admin: Events → Edit).
-- Every scheduled participant brings one guardian, so each distinct person on
-- the session's running order takes 2 seats; tickets take the rest.
-- Tickets belong to the pass that bought them (participant, performer, teacher,
-- or customer teacher) and can be edited at the desk.
--
-- Only the scanner Worker (service role) calls these functions; it verifies the
-- staff Clerk session and the pass HMAC first.

alter table public.events
  add column if not exists session_seat_limit integer not null default 125;
alter table public.events drop constraint if exists events_session_seat_limit_check;
alter table public.events add constraint events_session_seat_limit_check check (session_seat_limit > 0);

create table if not exists public.session_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_number integer not null check (session_number > 0),
  registration_id uuid references public.registrations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  -- Pass kind that bought them: participant | teacher | performer:<n> | customer.
  holder text not null check (holder in ('participant', 'teacher', 'customer') or holder ~ '^performer:[0-9]{1,2}$'),
  quantity integer not null check (quantity > 0),
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_tickets_one_holder check ((registration_id is null) <> (customer_id is null)),
  constraint session_tickets_customer_holder check ((customer_id is not null) = (holder = 'customer'))
);

create unique index if not exists session_tickets_registration_holder
  on public.session_tickets (event_id, session_number, registration_id, holder)
  where registration_id is not null;
create unique index if not exists session_tickets_customer_holder
  on public.session_tickets (event_id, session_number, customer_id)
  where customer_id is not null;

comment on table public.session_tickets is
  'Audience tickets per festival session and pass holder, written only by set_session_tickets.';

alter table public.session_tickets enable row level security;
revoke all on table public.session_tickets from anon, authenticated, public;

-- Seats per session. Sessions come from the published running order
-- (festival_schedule_segments); a session spans its first to last performance.
create or replace function public.festival_session_seats(p_event_id uuid)
returns table (
  session_number integer,
  starts_at timestamptz,
  ends_at timestamptz,
  seat_limit integer,
  participant_pax integer,
  tickets_sold integer,
  tickets_left integer
)
language sql
stable
security definer
set search_path = public
as $$
  with performances as (
    select s.id, s.session_number, s.starts_at, s.ends_at
      from festival_schedule_segments s
     where s.event_id = p_event_id and s.kind = 'performance' and s.session_number is not null
  ),
  sessions as (
    select p.session_number, min(p.starts_at) as starts_at, max(p.ends_at) as ends_at
      from performances p
     group by p.session_number
  ),
  -- One person playing twice in a session (or a duet partner) sits once.
  people as (
    select p.session_number,
           count(distinct lower(btrim(coalesce(performer.name, fe.display_name))))::integer as persons
      from performances p
      join festival_schedule_entries fe on fe.segment_id = p.id
      left join registrations r on r.id = fe.registration_id
      left join lateral unnest(r.performers) as performer(name) on true
     group by p.session_number
  ),
  sold as (
    select t.session_number, sum(t.quantity)::integer as quantity
      from session_tickets t
     where t.event_id = p_event_id
     group by t.session_number
  )
  select ss.session_number,
         ss.starts_at,
         ss.ends_at,
         ev.session_seat_limit,
         2 * coalesce(pp.persons, 0),
         coalesce(so.quantity, 0),
         greatest(0, ev.session_seat_limit - 2 * coalesce(pp.persons, 0) - coalesce(so.quantity, 0))
    from sessions ss
    join events ev on ev.id = p_event_id
    left join people pp on pp.session_number = ss.session_number
    left join sold so on so.session_number = ss.session_number
   order by ss.session_number;
$$;

-- Participants tab + navbar: the ongoing festival's running order grouped by
-- session and category, with check-ins, tickets, and seats left.
create or replace function public.scanner_event_overview(p_event_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ev record;
begin
  select e.id, e.title, e.session_seat_limit
    into ev
    from events e
   where case when p_event_id is null
              then e.status = 'ongoing'
                   and exists (select 1 from festival_schedule_segments s where s.event_id = e.id and s.kind = 'performance')
              else e.id = p_event_id end
   order by e.start_date nulls last
   limit 1;

  if not found then
    return jsonb_build_object('event', null, 'sessions', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'event', jsonb_build_object('id', ev.id, 'title', ev.title, 'seatLimit', ev.session_seat_limit),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'number', st.session_number,
        'startsAt', st.starts_at,
        'endsAt', st.ends_at,
        'participantPax', st.participant_pax,
        'ticketsSold', st.tickets_sold,
        'ticketsLeft', st.tickets_left,
        'blocks', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', s.id,
            'categoryName', c.name,
            'subCategoryName', sc.name,
            'startsAt', s.starts_at,
            'endsAt', s.ends_at,
            'entries', coalesce((
              select jsonb_agg(jsonb_build_object(
                'order', fe.order_index,
                'name', fe.display_name,
                'registrationId', fe.registration_id,
                'performers', coalesce(cardinality(r.performers), 1),
                'checkedIn', (
                  select count(*)
                    from registration_checkins rc
                   where rc.registration_id = fe.registration_id
                     and (rc.kind = 'participant' or rc.kind like 'performer:%')
                ),
                -- Teacher tickets sit on one arbitrary student's registration; leave them out.
                'tickets', (
                  select coalesce(sum(t.quantity), 0)
                    from session_tickets t
                   where t.event_id = ev.id
                     and t.session_number = st.session_number
                     and t.registration_id = fe.registration_id
                     and t.holder <> 'teacher'
                )
              ) order by fe.order_index)
                from festival_schedule_entries fe
                left join registrations r on r.id = fe.registration_id
               where fe.segment_id = s.id
            ), '[]'::jsonb)
          ) order by s.sort_order)
            from festival_schedule_segments s
            left join event_subcategories sc on sc.id = s.subcategory_id
            left join event_categories c on c.id = sc.category_id
           where s.event_id = ev.id
             and s.kind = 'performance'
             and s.session_number = st.session_number
        ), '[]'::jsonb)
      ) order by st.session_number)
        from festival_session_seats(ev.id) st
    ), '[]'::jsonb)
  );
end;
$$;

-- Scan card: where the pass holder plays, the sessions they can buy for, and
-- the tickets they already hold. p_holder is the pass kind
-- (participant | teacher | performer:<n> | customer).
--   participant / performer: their own performances; tickets are for that session.
--   teacher: every student they registered; any session.
--   customer: no performances; any session.
create or replace function public.scanner_pass_context(
  p_registration_id uuid,
  p_customer_id uuid,
  p_event_id uuid,
  p_holder text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_teacher text;
  v_performances jsonb;
  v_fixed integer;
begin
  if p_registration_id is not null then
    select r.event_id, case when p_holder = 'teacher' then lower(btrim(r.registrant_name)) end
      into v_event, v_teacher
      from registrations r
     where r.id = p_registration_id;
  else
    v_event := p_event_id;
  end if;
  if v_event is null then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'sessionNumber', s.session_number,
           'categoryName', c.name,
           'subCategoryName', sc.name,
           'startsAt', s.starts_at,
           'endsAt', s.ends_at,
           'order', fe.order_index,
           'name', fe.display_name
         ) order by s.sort_order, fe.order_index), '[]'::jsonb),
         min(s.session_number)
    into v_performances, v_fixed
    from festival_schedule_entries fe
    join festival_schedule_segments s on s.id = fe.segment_id
    left join event_subcategories sc on sc.id = s.subcategory_id
    left join event_categories c on c.id = sc.category_id
   where s.event_id = v_event
     and s.kind = 'performance'
     and s.session_number is not null
     and fe.registration_id is not null
     and case
           when p_holder = 'teacher' then fe.registration_id in (
             select r.id from registrations r
              where r.event_id = v_event
                and r.registrant_status = 'teacher'
                and lower(btrim(r.registrant_name)) = v_teacher)
           when p_holder = 'customer' then false
           else fe.registration_id = p_registration_id
         end;

  return jsonb_build_object(
    'eventId', v_event,
    'chooseSession', p_holder in ('teacher', 'customer'),
    'fixedSession', case when p_holder in ('teacher', 'customer') then null else v_fixed end,
    'performances', v_performances,
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'number', st.session_number,
        'startsAt', st.starts_at,
        'endsAt', st.ends_at,
        'ticketsLeft', st.tickets_left
      ) order by st.session_number)
        from festival_session_seats(v_event) st
    ), '[]'::jsonb),
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object('sessionNumber', t.session_number, 'quantity', t.quantity) order by t.session_number)
        from session_tickets t
       where t.event_id = v_event
         and case when p_customer_id is not null
                  then t.customer_id = p_customer_id
                  else t.registration_id = p_registration_id and t.holder = p_holder end
    ), '[]'::jsonb)
  );
end;
$$;

-- Set (or clear, with 0) the tickets a pass holder has for one session.
-- Serialised per session, so two desks cannot oversell the last seats.
-- Lowering an existing purchase is always allowed, even if the session is
-- already over its limit (e.g. after the limit was reduced).
create or replace function public.set_session_tickets(
  p_registration_id uuid,
  p_customer_id uuid,
  p_event_id uuid,
  p_holder text,
  p_session_number integer,
  p_quantity integer,
  p_updated_by text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reg record;
  v_event uuid;
  v_session integer := p_session_number;
  v_current integer;
  v_available integer;
begin
  if p_quantity is null or p_quantity < 0 or p_quantity > 999 then
    return jsonb_build_object('error', 'invalid_quantity');
  end if;

  if p_registration_id is not null then
    select r.event_id, r.status::text as status, r.registrant_status::text as registrant_status
      into reg
      from registrations r
     where r.id = p_registration_id;
    if not found or reg.status is distinct from 'verified'
       or (p_holder = 'teacher' and reg.registrant_status is distinct from 'teacher') then
      return jsonb_build_object('error', 'not_eligible');
    end if;
    v_event := reg.event_id;

    if p_holder <> 'teacher' then
      -- Participants and performers buy for the session they play in.
      select min(s.session_number) into v_session
        from festival_schedule_entries fe
        join festival_schedule_segments s on s.id = fe.segment_id
       where fe.registration_id = p_registration_id
         and s.event_id = v_event
         and s.kind = 'performance';
      if v_session is null then
        return jsonb_build_object('error', 'no_session');
      end if;
      if p_session_number is not null and p_session_number <> v_session then
        return jsonb_build_object('error', 'wrong_session');
      end if;
    end if;
  else
    if not exists (
      select 1 from customers c
       where c.id = p_customer_id and coalesce(c.type, '') in ('teacher', 'music school/institution')
    ) then
      return jsonb_build_object('error', 'not_eligible');
    end if;
    v_event := p_event_id;
  end if;

  if v_session is null or not exists (
    select 1 from festival_schedule_segments s
     where s.event_id = v_event and s.kind = 'performance' and s.session_number = v_session
  ) then
    return jsonb_build_object('error', 'no_session');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('session_tickets:' || v_event::text || ':' || v_session::text, 0));

  select t.quantity into v_current
    from session_tickets t
   where t.event_id = v_event
     and t.session_number = v_session
     and case when p_customer_id is not null
              then t.customer_id = p_customer_id
              else t.registration_id = p_registration_id and t.holder = p_holder end;
  v_current := coalesce(v_current, 0);

  -- Seats this holder may own: what is free plus what they already hold.
  select st.seat_limit - st.participant_pax - st.tickets_sold + v_current
    into v_available
    from festival_session_seats(v_event) st
   where st.session_number = v_session;

  if p_quantity > v_current and p_quantity > v_available then
    return jsonb_build_object(
      'error', 'over_capacity',
      'sessionNumber', v_session,
      'available', greatest(v_available, v_current)
    );
  end if;

  if p_quantity = 0 then
    delete from session_tickets t
     where t.event_id = v_event
       and t.session_number = v_session
       and case when p_customer_id is not null
                then t.customer_id = p_customer_id
                else t.registration_id = p_registration_id and t.holder = p_holder end;
  elsif p_customer_id is not null then
    insert into session_tickets (event_id, session_number, customer_id, holder, quantity, updated_by)
    values (v_event, v_session, p_customer_id, 'customer', p_quantity, p_updated_by)
    on conflict (event_id, session_number, customer_id) where customer_id is not null
    do update set quantity = excluded.quantity, updated_by = excluded.updated_by, updated_at = now();
  else
    insert into session_tickets (event_id, session_number, registration_id, holder, quantity, updated_by)
    values (v_event, v_session, p_registration_id, p_holder, p_quantity, p_updated_by)
    on conflict (event_id, session_number, registration_id, holder) where registration_id is not null
    do update set quantity = excluded.quantity, updated_by = excluded.updated_by, updated_at = now();
  end if;

  return jsonb_build_object(
    'sessionNumber', v_session,
    'quantity', p_quantity,
    'ticketsLeft', greatest(0, v_available - p_quantity)
  );
end;
$$;

revoke all on function public.festival_session_seats(uuid) from public, anon, authenticated;
revoke all on function public.scanner_event_overview(uuid) from public, anon, authenticated;
revoke all on function public.scanner_pass_context(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.set_session_tickets(uuid, uuid, uuid, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.festival_session_seats(uuid) to service_role;
grant execute on function public.scanner_event_overview(uuid) to service_role;
grant execute on function public.scanner_pass_context(uuid, uuid, uuid, text) to service_role;
grant execute on function public.set_session_tickets(uuid, uuid, uuid, text, integer, integer, text) to service_role;
