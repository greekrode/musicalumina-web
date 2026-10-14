-- Audience tickets paid by QRIS at the check-in desk (Mayar "Pay Me" QR).
--
-- events.ticket_price (IDR, admin: Events → Edit) prices one ticket. The
-- scanner Worker starts a payment (start_ticket_payment: price × tickets, seats
-- held), creates a Mayar QR for that amount, then polls Mayar's payme balance
-- history every second and hands the credits to settle_ticket_payment, which
-- claims the first unclaimed paid credit of exactly that amount made while the
-- QR was live and adds the tickets.
--
-- Mayar's history does not say which QR a credit paid, so the amount is the
-- only link: at most one pending payment per amount across all desks, and a
-- credit settles one payment at most. Two desks can take QRIS at once as long
-- as their amounts differ.
--
-- Only the scanner Worker (service role) calls these functions; it verifies the
-- staff Clerk session and the pass HMAC first.

alter table public.events add column if not exists ticket_price integer;
alter table public.events drop constraint if exists events_ticket_price_check;
alter table public.events add constraint events_ticket_price_check check (ticket_price is null or ticket_price > 0);
comment on column public.events.ticket_price is
  'Festival audience ticket price in IDR, charged by QRIS at the check-in desk. Null: QRIS off.';

create table if not exists public.ticket_payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_number integer not null check (session_number > 0),
  registration_id uuid references public.registrations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  -- Pass kind that pays: participant | teacher | performer:<n> | customer.
  holder text not null check (holder in ('participant', 'teacher', 'customer') or holder ~ '^performer:[0-9]{1,2}$'),
  -- Tickets added to the holder's session once paid.
  quantity integer not null check (quantity > 0),
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'expired')),
  -- The Mayar balance-history credit that paid it.
  mayar_item_id text unique,
  created_by text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  settled_at timestamptz,
  constraint ticket_payments_one_holder check ((registration_id is null) <> (customer_id is null)),
  constraint ticket_payments_customer_holder check ((customer_id is not null) = (holder = 'customer')),
  constraint ticket_payments_paid_item check ((status = 'paid') = (mayar_item_id is not null))
);

-- The amount is the only link from a Mayar credit back to its QR.
create unique index if not exists ticket_payments_one_pending_amount
  on public.ticket_payments (amount) where status = 'pending';
create index if not exists ticket_payments_pending_session
  on public.ticket_payments (event_id, session_number) where status = 'pending';

comment on table public.ticket_payments is
  'QRIS ticket payments from the check-in desk, written only by start_ticket_payment and settle_ticket_payment.';

alter table public.ticket_payments enable row level security;
revoke all on table public.ticket_payments from anon, authenticated, public;

-- Seats per session, now also net of seats held by live QRIS payments.
-- The return type gains tickets_held, so the function is recreated.
drop function if exists public.festival_session_seats(uuid);
create function public.festival_session_seats(p_event_id uuid)
returns table (
  session_number integer,
  starts_at timestamptz,
  ends_at timestamptz,
  seat_limit integer,
  participant_pax integer,
  tickets_sold integer,
  tickets_held integer,
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
  ),
  -- Seats a QR on screen is paying for.
  held as (
    select tp.session_number, sum(tp.quantity)::integer as quantity
      from ticket_payments tp
     where tp.event_id = p_event_id and tp.status = 'pending' and tp.expires_at > now()
     group by tp.session_number
  )
  select ss.session_number,
         ss.starts_at,
         ss.ends_at,
         ev.session_seat_limit,
         2 * coalesce(pp.persons, 0),
         coalesce(so.quantity, 0),
         coalesce(he.quantity, 0),
         greatest(0, ev.session_seat_limit - 2 * coalesce(pp.persons, 0) - coalesce(so.quantity, 0) - coalesce(he.quantity, 0))
    from sessions ss
    join events ev on ev.id = p_event_id
    left join people pp on pp.session_number = ss.session_number
    left join sold so on so.session_number = ss.session_number
    left join held he on he.session_number = ss.session_number
   order by ss.session_number;
$$;

-- Which event and session a pass holder buys tickets for, or why they cannot.
-- Participants and performers buy for the session they play in; teachers and
-- customer teachers pick one.
create or replace function public.ticket_holder_session(
  p_registration_id uuid,
  p_customer_id uuid,
  p_event_id uuid,
  p_holder text,
  p_session_number integer
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  reg record;
  v_event uuid;
  v_session integer := p_session_number;
begin
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

  return jsonb_build_object('eventId', v_event, 'sessionNumber', v_session);
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
  v_target jsonb;
  v_event uuid;
  v_session integer;
  v_current integer;
  v_available integer;
begin
  if p_quantity is null or p_quantity < 0 or p_quantity > 999 then
    return jsonb_build_object('error', 'invalid_quantity');
  end if;

  v_target := ticket_holder_session(p_registration_id, p_customer_id, p_event_id, p_holder, p_session_number);
  if v_target ? 'error' then
    return v_target;
  end if;
  v_event := (v_target->>'eventId')::uuid;
  v_session := (v_target->>'sessionNumber')::integer;

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
  select st.seat_limit - st.participant_pax - st.tickets_sold - st.tickets_held + v_current
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

-- Start a QRIS payment for p_quantity more tickets: holds the seats for five
-- minutes and returns the amount to put on the QR (ticket_price × quantity).
create or replace function public.start_ticket_payment(
  p_registration_id uuid,
  p_customer_id uuid,
  p_event_id uuid,
  p_holder text,
  p_session_number integer,
  p_quantity integer,
  p_created_by text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target jsonb;
  v_event uuid;
  v_session integer;
  v_price integer;
  v_amount bigint;
  v_current integer;
  v_left integer;
  v_payment ticket_payments;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 999 then
    return jsonb_build_object('error', 'invalid_quantity');
  end if;

  v_target := ticket_holder_session(p_registration_id, p_customer_id, p_event_id, p_holder, p_session_number);
  if v_target ? 'error' then
    return v_target;
  end if;
  v_event := (v_target->>'eventId')::uuid;
  v_session := (v_target->>'sessionNumber')::integer;

  select e.ticket_price into v_price from events e where e.id = v_event;
  if v_price is null then
    return jsonb_build_object('error', 'no_price');
  end if;
  v_amount := v_price::bigint * p_quantity;
  if v_amount > 2147483647 then
    return jsonb_build_object('error', 'invalid_quantity');
  end if;

  -- Lapsed QRs stop holding seats and amounts. (Row locks before the session
  -- lock, the same order settle_ticket_payment takes them in.)
  update ticket_payments
     set status = 'expired', settled_at = now()
   where status = 'pending' and expires_at <= now();

  perform pg_advisory_xact_lock(hashtextextended('session_tickets:' || v_event::text || ':' || v_session::text, 0));

  select st.tickets_left into v_left
    from festival_session_seats(v_event) st
   where st.session_number = v_session;
  if coalesce(v_left, 0) < p_quantity then
    select t.quantity into v_current
      from session_tickets t
     where t.event_id = v_event
       and t.session_number = v_session
       and case when p_customer_id is not null
                then t.customer_id = p_customer_id
                else t.registration_id = p_registration_id and t.holder = p_holder end;
    return jsonb_build_object(
      'error', 'over_capacity',
      'sessionNumber', v_session,
      'available', coalesce(v_current, 0) + coalesce(v_left, 0)
    );
  end if;

  begin
    insert into ticket_payments (
      event_id, session_number, registration_id, customer_id, holder,
      quantity, amount, created_by, expires_at
    ) values (
      v_event, v_session, p_registration_id, p_customer_id,
      case when p_customer_id is not null then 'customer' else p_holder end,
      p_quantity, v_amount, p_created_by, now() + interval '5 minutes'
    )
    returning * into v_payment;
  exception when unique_violation then
    return jsonb_build_object('error', 'amount_pending', 'amount', v_amount);
  end;

  return jsonb_build_object(
    'paymentId', v_payment.id,
    'sessionNumber', v_session,
    'quantity', p_quantity,
    'amount', v_payment.amount,
    'expiresAt', v_payment.expires_at
  );
end;
$$;

-- Settle a QRIS payment from Mayar's latest payme credits
-- (p_items: [{ id, createdAt (ms), credit, status }]). Claims the oldest
-- unclaimed paid credit of exactly the amount made while the QR was live and
-- adds the tickets. Otherwise the payment stays pending, lapses once expired,
-- or is cancelled when p_cancel. Returns the payment's status; once paid, also
-- the holder's tickets for the session and the seats left.
create or replace function public.settle_ticket_payment(
  p_payment_id uuid,
  p_items jsonb,
  p_cancel boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment ticket_payments;
  v_item text;
  v_quantity integer;
  v_left integer;
begin
  select * into v_payment from ticket_payments tp where tp.id = p_payment_id for update;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  -- A credit that landed before the QR lapsed still pays it, even if a desk
  -- already marked it expired.
  if v_payment.status in ('pending', 'expired') then
    select i->>'id' into v_item
      from jsonb_array_elements(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) i
     where i->>'status' in ('paid', 'settled')
       and (i->>'credit')::numeric = v_payment.amount
       and to_timestamp((i->>'createdAt')::numeric / 1000)
           between v_payment.created_at - interval '5 seconds' and v_payment.expires_at
       and not exists (select 1 from ticket_payments tp where tp.mayar_item_id = i->>'id')
     order by (i->>'createdAt')::numeric
     limit 1;

    if v_item is not null then
      perform pg_advisory_xact_lock(hashtextextended(
        'session_tickets:' || v_payment.event_id::text || ':' || v_payment.session_number::text, 0));
      -- Paid seats are honoured even if the session filled up meanwhile.
      if v_payment.customer_id is not null then
        insert into session_tickets (event_id, session_number, customer_id, holder, quantity, updated_by)
        values (v_payment.event_id, v_payment.session_number, v_payment.customer_id, 'customer', v_payment.quantity, v_payment.created_by)
        on conflict (event_id, session_number, customer_id) where customer_id is not null
        do update set quantity = session_tickets.quantity + excluded.quantity, updated_by = excluded.updated_by, updated_at = now();
      else
        insert into session_tickets (event_id, session_number, registration_id, holder, quantity, updated_by)
        values (v_payment.event_id, v_payment.session_number, v_payment.registration_id, v_payment.holder, v_payment.quantity, v_payment.created_by)
        on conflict (event_id, session_number, registration_id, holder) where registration_id is not null
        do update set quantity = session_tickets.quantity + excluded.quantity, updated_by = excluded.updated_by, updated_at = now();
      end if;
      update ticket_payments
         set status = 'paid', mayar_item_id = v_item, settled_at = now()
       where id = p_payment_id
      returning * into v_payment;
    elsif v_payment.status = 'pending' and (p_cancel or v_payment.expires_at <= now()) then
      update ticket_payments
         set status = case when p_cancel then 'cancelled' else 'expired' end, settled_at = now()
       where id = p_payment_id
      returning * into v_payment;
    end if;
  end if;

  if v_payment.status <> 'paid' then
    return jsonb_build_object('status', v_payment.status, 'amount', v_payment.amount, 'expiresAt', v_payment.expires_at);
  end if;

  select t.quantity into v_quantity
    from session_tickets t
   where t.event_id = v_payment.event_id
     and t.session_number = v_payment.session_number
     and case when v_payment.customer_id is not null
              then t.customer_id = v_payment.customer_id
              else t.registration_id = v_payment.registration_id and t.holder = v_payment.holder end;
  select st.tickets_left into v_left
    from festival_session_seats(v_payment.event_id) st
   where st.session_number = v_payment.session_number;

  return jsonb_build_object(
    'status', 'paid',
    'amount', v_payment.amount,
    'sessionNumber', v_payment.session_number,
    'quantity', coalesce(v_quantity, 0),
    'ticketsLeft', coalesce(v_left, 0)
  );
end;
$$;

-- Scan card: as before, plus the ticket price for QRIS.
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
    'ticketPrice', (select e.ticket_price from events e where e.id = v_event),
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

revoke all on function public.festival_session_seats(uuid) from public, anon, authenticated;
revoke all on function public.ticket_holder_session(uuid, uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.start_ticket_payment(uuid, uuid, uuid, text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.settle_ticket_payment(uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.festival_session_seats(uuid) to service_role;
grant execute on function public.ticket_holder_session(uuid, uuid, uuid, text, integer) to service_role;
grant execute on function public.start_ticket_payment(uuid, uuid, uuid, text, integer, integer, text) to service_role;
grant execute on function public.settle_ticket_payment(uuid, jsonb, boolean) to service_role;
