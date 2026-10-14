-- QRIS ticket payments get a unique code: the QR asks for price × tickets plus
-- a random 1–9 rupiah, picked from the codes no pending payment of the same
-- base amount is using. Up to nine desks can then wait on the same ticket
-- count at once, and round Pay Me credits from elsewhere never match a desk QR.
-- The amount stays the only link from a Mayar credit back to its QR, so
-- ticket_payments_one_pending_amount still guards the total.

alter table public.ticket_payments
  add column if not exists unique_code smallint not null default 0;
alter table public.ticket_payments drop constraint if exists ticket_payments_unique_code_check;
alter table public.ticket_payments add constraint ticket_payments_unique_code_check check (unique_code between 0 and 9);

-- Start a QRIS payment for p_quantity more tickets: holds the seats for five
-- minutes and returns the amount to put on the QR
-- (ticket_price × quantity + unique code).
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
  v_base bigint;
  v_code integer;
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
  v_base := v_price::bigint * p_quantity;
  if v_base + 9 > 2147483647 then
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

  -- A random free code. Another session's desk can take the same one between
  -- the pick and the insert; the unique index catches that and we pick again.
  for attempt in 1..3 loop
    select c into v_code
      from generate_series(1, 9) c
     where not exists (
       select 1 from ticket_payments tp where tp.status = 'pending' and tp.amount = v_base + c
     )
     order by random()
     limit 1;
    if v_code is null then
      return jsonb_build_object('error', 'amount_pending', 'amount', v_base);
    end if;

    begin
      insert into ticket_payments (
        event_id, session_number, registration_id, customer_id, holder,
        quantity, amount, unique_code, created_by, expires_at
      ) values (
        v_event, v_session, p_registration_id, p_customer_id,
        case when p_customer_id is not null then 'customer' else p_holder end,
        p_quantity, v_base + v_code, v_code, p_created_by, now() + interval '5 minutes'
      )
      returning * into v_payment;
      exit;
    exception when unique_violation then
      v_code := null;
    end;
  end loop;
  if v_payment.id is null then
    return jsonb_build_object('error', 'amount_pending', 'amount', v_base);
  end if;

  return jsonb_build_object(
    'paymentId', v_payment.id,
    'sessionNumber', v_session,
    'quantity', p_quantity,
    'amount', v_payment.amount,
    'uniqueCode', v_payment.unique_code,
    'expiresAt', v_payment.expires_at
  );
end;
$$;

revoke all on function public.start_ticket_payment(uuid, uuid, uuid, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.start_ticket_payment(uuid, uuid, uuid, text, integer, integer, text) to service_role;
