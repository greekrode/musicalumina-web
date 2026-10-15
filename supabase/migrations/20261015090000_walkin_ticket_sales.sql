-- Walk-in ticket sales: the check-in desk sells tickets to members of the
-- public who have no pass. A walk-in sale (holder 'walkin') belongs to no
-- registration or customer: each sale is its own session_tickets row for the
-- session the desk picks, paid by QRIS, cash or bank transfer like any other
-- desk purchase. Nothing is scanned later; the buyer walks in on the spot.
--
-- Only the scanner Worker (service role) calls these functions; it verifies
-- the staff Clerk session first.

alter table public.session_tickets drop constraint if exists session_tickets_holder_check;
alter table public.session_tickets add constraint session_tickets_holder_check
  check (holder in ('participant', 'teacher', 'customer', 'walkin') or holder ~ '^performer:[0-9]{1,2}$');
alter table public.session_tickets drop constraint if exists session_tickets_one_holder;
alter table public.session_tickets add constraint session_tickets_one_holder check (
  case when holder = 'walkin'
       then registration_id is null and customer_id is null
       else (registration_id is null) <> (customer_id is null) end
);

alter table public.ticket_payments drop constraint if exists ticket_payments_holder_check;
alter table public.ticket_payments add constraint ticket_payments_holder_check
  check (holder in ('participant', 'teacher', 'customer', 'walkin') or holder ~ '^performer:[0-9]{1,2}$');
alter table public.ticket_payments drop constraint if exists ticket_payments_one_holder;
alter table public.ticket_payments add constraint ticket_payments_one_holder check (
  case when holder = 'walkin'
       then registration_id is null and customer_id is null
       else (registration_id is null) <> (customer_id is null) end
);

-- As before, plus walk-ins: any session of event p_event_id.
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
  if p_holder = 'walkin' then
    if p_registration_id is not null or p_customer_id is not null
       or not exists (select 1 from events e where e.id = p_event_id) then
      return jsonb_build_object('error', 'not_eligible');
    end if;
    v_event := p_event_id;
  elsif p_registration_id is not null then
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

-- As before; a walk-in sale is a row of its own.
create or replace function public.add_ticket_payment_tickets(p_payment ticket_payments, p_updated_by text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(
    'session_tickets:' || p_payment.event_id::text || ':' || p_payment.session_number::text, 0));
  if p_payment.holder = 'walkin' then
    insert into session_tickets (event_id, session_number, holder, quantity, updated_by)
    values (p_payment.event_id, p_payment.session_number, 'walkin', p_payment.quantity, p_updated_by);
  elsif p_payment.customer_id is not null then
    insert into session_tickets (event_id, session_number, customer_id, holder, quantity, updated_by)
    values (p_payment.event_id, p_payment.session_number, p_payment.customer_id, 'customer', p_payment.quantity, p_updated_by)
    on conflict (event_id, session_number, customer_id) where customer_id is not null
    do update set quantity = session_tickets.quantity + excluded.quantity, updated_by = excluded.updated_by, updated_at = now();
  else
    insert into session_tickets (event_id, session_number, registration_id, holder, quantity, updated_by)
    values (p_payment.event_id, p_payment.session_number, p_payment.registration_id, p_payment.holder, p_payment.quantity, p_updated_by)
    on conflict (event_id, session_number, registration_id, holder) where registration_id is not null
    do update set quantity = session_tickets.quantity + excluded.quantity, updated_by = excluded.updated_by, updated_at = now();
  end if;
end;
$$;

create or replace function public.ticket_payment_holder_name(p_payment ticket_payments)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_payment.holder = 'walkin' then 'Walk-in guest'
    when p_payment.customer_id is not null then (select c.name from customers c where c.id = p_payment.customer_id)
    else (
      select case
        when p_payment.holder = 'teacher' then r.registrant_name
        when p_payment.holder like 'performer:%' then r.performers[substr(p_payment.holder, 11)::integer + 1]
        else r.participant_name end
        from registrations r
       where r.id = p_payment.registration_id)
  end;
$$;

-- As before; a walk-in holds just what this sale bought.
create or replace function public.ticket_payment_paid_result(p_payment ticket_payments)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'status', 'paid',
    'amount', p_payment.amount,
    'sessionNumber', p_payment.session_number,
    'holderName', ticket_payment_holder_name(p_payment),
    'quantity', case when p_payment.holder = 'walkin' then p_payment.quantity else coalesce((
      select t.quantity
        from session_tickets t
       where t.event_id = p_payment.event_id
         and t.session_number = p_payment.session_number
         and case when p_payment.customer_id is not null
                  then t.customer_id = p_payment.customer_id
                  else t.registration_id = p_payment.registration_id and t.holder = p_payment.holder end
    ), 0) end,
    'ticketsLeft', coalesce((
      select st.tickets_left
        from festival_session_seats(p_payment.event_id) st
       where st.session_number = p_payment.session_number
    ), 0)
  );
$$;

-- As before, plus the ticket price, so the desk can sell to walk-ins.
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
  select e.id, e.title, e.session_seat_limit, e.ticket_price
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
    'event', jsonb_build_object('id', ev.id, 'title', ev.title, 'seatLimit', ev.session_seat_limit, 'ticketPrice', ev.ticket_price),
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
