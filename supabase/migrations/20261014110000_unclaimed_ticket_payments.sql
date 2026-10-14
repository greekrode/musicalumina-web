-- Unclaimed QRIS payments: Mayar credits that landed after their desk QR was
-- cancelled or lapsed, so no desk added the tickets. The desk lists them with
-- the QRs of exactly that amount they could belong to (the unique code makes
-- that usually one), and staff add the tickets to the right one.
--
-- Only the scanner Worker (service role) calls these functions; it passes
-- Mayar's latest payme credits, as for settle_ticket_payment.

-- Who a payment is for, as the desk shows it.
create or replace function public.ticket_payment_holder_name(p_payment ticket_payments)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
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

-- Add a payment's tickets and mark it paid by Mayar credit p_item.
-- The caller holds the payment row lock and has checked the credit.
-- Paid seats are honoured even if the session filled up meanwhile.
create or replace function public.pay_ticket_payment(p_payment ticket_payments, p_item text, p_updated_by text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(
    'session_tickets:' || p_payment.event_id::text || ':' || p_payment.session_number::text, 0));
  if p_payment.customer_id is not null then
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
  update ticket_payments
     set status = 'paid', mayar_item_id = p_item, settled_at = now()
   where id = p_payment.id;
end;
$$;

-- A paid payment as the desk sees it: the holder's tickets for the session
-- now, and the seats left.
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
    'quantity', coalesce((
      select t.quantity
        from session_tickets t
       where t.event_id = p_payment.event_id
         and t.session_number = p_payment.session_number
         and case when p_payment.customer_id is not null
                  then t.customer_id = p_payment.customer_id
                  else t.registration_id = p_payment.registration_id and t.holder = p_payment.holder end
    ), 0),
    'ticketsLeft', coalesce((
      select st.tickets_left
        from festival_session_seats(p_payment.event_id) st
       where st.session_number = p_payment.session_number
    ), 0)
  );
$$;

-- As before, on the shared helpers.
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
      perform pay_ticket_payment(v_payment, v_item, v_payment.created_by);
      select * into v_payment from ticket_payments tp where tp.id = p_payment_id;
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
  return ticket_payment_paid_result(v_payment);
end;
$$;

-- Mayar credits (p_items, as for settle_ticket_payment) no desk claimed, each
-- with the QRs it could pay: same amount, made before the credit (within a
-- day), and no longer on screen (cancelled, expired, or lapsed). A credit a
-- live QR can still take is left to that desk's polling.
create or replace function public.unclaimed_ticket_payments(p_items jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with credits as (
    select i->>'id' as id,
           (i->>'credit')::numeric as amount,
           to_timestamp((i->>'createdAt')::numeric / 1000) as paid_at
      from jsonb_array_elements(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) i
     where i->>'status' in ('paid', 'settled')
       and not exists (select 1 from ticket_payments tp where tp.mayar_item_id = i->>'id')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'amount', c.amount,
           'paidAt', c.paid_at,
           'payments', x.payments
         ) order by c.paid_at desc), '[]'::jsonb)
    from credits c
    cross join lateral (
      select jsonb_agg(jsonb_build_object(
               'paymentId', tp.id,
               'status', case when tp.status = 'pending' then 'expired' else tp.status end,
               'holderName', ticket_payment_holder_name(tp),
               'sessionNumber', tp.session_number,
               'quantity', tp.quantity,
               'createdAt', tp.created_at
             ) order by tp.created_at desc) as payments
        from ticket_payments tp
       where tp.amount = c.amount
         and (tp.status in ('cancelled', 'expired') or (tp.status = 'pending' and tp.expires_at <= now()))
         and c.paid_at >= tp.created_at - interval '5 seconds'
         and c.paid_at <= tp.created_at + interval '1 day'
    ) x
   where x.payments is not null
     and not exists (
       select 1 from ticket_payments tp
        where tp.status = 'pending' and tp.expires_at > now()
          and tp.amount = c.amount and c.paid_at >= tp.created_at - interval '5 seconds'
     );
$$;

-- Staff add a cancelled or lapsed QR's tickets for Mayar credit p_item_id,
-- which must be in p_items (Mayar's latest credits, fetched by the Worker),
-- paid, unclaimed, of exactly the amount, and made after the QR.
create or replace function public.claim_ticket_payment(
  p_payment_id uuid,
  p_item_id text,
  p_items jsonb,
  p_claimed_by text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment ticket_payments;
begin
  select * into v_payment from ticket_payments tp where tp.id = p_payment_id for update;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_payment.status = 'paid' then
    return jsonb_build_object('error', 'already_paid');
  end if;
  if v_payment.status = 'pending' and v_payment.expires_at > now() then
    return jsonb_build_object('error', 'still_pending');
  end if;

  if not exists (
    select 1
      from jsonb_array_elements(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) i
     where i->>'id' = p_item_id
       and i->>'status' in ('paid', 'settled')
       and (i->>'credit')::numeric = v_payment.amount
       and to_timestamp((i->>'createdAt')::numeric / 1000) >= v_payment.created_at - interval '5 seconds'
  ) then
    return jsonb_build_object('error', 'no_credit');
  end if;
  if exists (select 1 from ticket_payments tp where tp.mayar_item_id = p_item_id) then
    return jsonb_build_object('error', 'credit_claimed');
  end if;

  perform pay_ticket_payment(v_payment, p_item_id, p_claimed_by);
  select * into v_payment from ticket_payments tp where tp.id = p_payment_id;
  return ticket_payment_paid_result(v_payment);
end;
$$;

revoke all on function public.ticket_payment_holder_name(ticket_payments) from public, anon, authenticated;
revoke all on function public.pay_ticket_payment(ticket_payments, text, text) from public, anon, authenticated;
revoke all on function public.ticket_payment_paid_result(ticket_payments) from public, anon, authenticated;
revoke all on function public.settle_ticket_payment(uuid, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.unclaimed_ticket_payments(jsonb) from public, anon, authenticated;
revoke all on function public.claim_ticket_payment(uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.ticket_payment_holder_name(ticket_payments) to service_role;
grant execute on function public.pay_ticket_payment(ticket_payments, text, text) to service_role;
grant execute on function public.ticket_payment_paid_result(ticket_payments) to service_role;
grant execute on function public.settle_ticket_payment(uuid, jsonb, boolean) to service_role;
grant execute on function public.unclaimed_ticket_payments(jsonb) to service_role;
grant execute on function public.claim_ticket_payment(uuid, text, jsonb, text) to service_role;
