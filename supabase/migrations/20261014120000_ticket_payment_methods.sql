-- Desk ticket purchases record how they were paid: QRIS (Mayar, as before),
-- cash, or bank transfer with a photo of the transfer. Cash and transfer are
-- paid on the spot, so record_ticket_payment adds the tickets at once.
-- Transfer photos live in the private ticket-transfer-proofs bucket
-- (registration/<id>/<uuid>.jpg or customer/<id>/<uuid>.jpg), uploaded by the
-- scanner Worker; no policies, so only the service role (Worker, dashboard)
-- can read them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-transfer-proofs', 'ticket-transfer-proofs', false, 5242880, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.ticket_payments
  add column if not exists method text not null default 'qris',
  add column if not exists proof_path text;
alter table public.ticket_payments drop constraint if exists ticket_payments_method_check;
alter table public.ticket_payments add constraint ticket_payments_method_check check (method in ('qris', 'cash', 'transfer'));
-- QRIS is paid by exactly one Mayar credit; cash and transfer are paid when recorded.
alter table public.ticket_payments drop constraint if exists ticket_payments_paid_item;
alter table public.ticket_payments add constraint ticket_payments_paid_item check (
  case when method = 'qris'
       then (status = 'paid') = (mayar_item_id is not null)
       else status = 'paid' and mayar_item_id is null end
);
alter table public.ticket_payments drop constraint if exists ticket_payments_transfer_proof;
alter table public.ticket_payments add constraint ticket_payments_transfer_proof check ((method = 'transfer') = (proof_path is not null));

-- Add a payment's tickets to its holder's session.
-- Paid seats are honoured even if the session filled up meanwhile.
create or replace function public.add_ticket_payment_tickets(p_payment ticket_payments, p_updated_by text)
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
end;
$$;

-- QRIS: add the tickets and mark the payment paid by Mayar credit p_item.
-- The caller holds the payment row lock and has checked the credit.
create or replace function public.pay_ticket_payment(p_payment ticket_payments, p_item text, p_updated_by text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform add_ticket_payment_tickets(p_payment, p_updated_by);
  update ticket_payments
     set status = 'paid', mayar_item_id = p_item, settled_at = now()
   where id = p_payment.id;
end;
$$;

-- Cash or bank transfer for p_quantity more tickets, paid at the desk:
-- records the payment (ticket_price × quantity) and adds the tickets.
-- p_proof_path: the transfer photo the Worker uploaded (transfer only).
create or replace function public.record_ticket_payment(
  p_registration_id uuid,
  p_customer_id uuid,
  p_event_id uuid,
  p_holder text,
  p_session_number integer,
  p_quantity integer,
  p_method text,
  p_proof_path text,
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
  if p_method not in ('cash', 'transfer') or ((p_method = 'transfer') <> (p_proof_path is not null)) then
    return jsonb_build_object('error', 'invalid_method');
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

  insert into ticket_payments (
    event_id, session_number, registration_id, customer_id, holder,
    quantity, amount, method, proof_path, status, created_by, expires_at, settled_at
  ) values (
    v_event, v_session, p_registration_id, p_customer_id,
    case when p_customer_id is not null then 'customer' else p_holder end,
    p_quantity, v_amount, p_method, p_proof_path, 'paid', p_created_by, now(), now()
  )
  returning * into v_payment;
  perform add_ticket_payment_tickets(v_payment, p_created_by);

  return ticket_payment_paid_result(v_payment) || jsonb_build_object('method', p_method);
end;
$$;

revoke all on function public.add_ticket_payment_tickets(ticket_payments, text) from public, anon, authenticated;
revoke all on function public.pay_ticket_payment(ticket_payments, text, text) from public, anon, authenticated;
revoke all on function public.record_ticket_payment(uuid, uuid, uuid, text, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.add_ticket_payment_tickets(ticket_payments, text) to service_role;
grant execute on function public.pay_ticket_payment(ticket_payments, text, text) to service_role;
grant execute on function public.record_ticket_payment(uuid, uuid, uuid, text, integer, integer, text, text, text) to service_role;
