-- Teacher passes for people who are not registrants (e.g. one of a music
-- school's teachers): pass kind 4 carries customers.id + events.id, both signed.
-- The scanner Worker verifies the signature, then calls check_in_customer_pass;
-- the customer row must still exist and be a teacher or school, so deleting or
-- retyping the customer revokes the pass.
create table if not exists public.customer_checkins (
  customer_id uuid not null references public.customers(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by text not null,
  created_at timestamptz not null default now(),
  primary key (customer_id, event_id)
);

comment on table public.customer_checkins is
  'One check-in per customer teacher per event, written only by check_in_customer_pass.';

alter table public.customer_checkins enable row level security;
revoke all on table public.customer_checkins from anon, authenticated, public;

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
  if not found or coalesce(cust.type, '') not in ('teacher', 'music school/institution') then
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

revoke all on function public.check_in_customer_pass(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.check_in_customer_pass(uuid, uuid, text) to service_role;
