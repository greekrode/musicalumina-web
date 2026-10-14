-- Adjudicator remarks sheets: one PDF per scored registration (participant +
-- category), emailed as download links, one email per registrant address.
-- The remarks-sheets edge function renders and sends with the service role;
-- this log stops a registrant address from being emailed twice per event.

insert into storage.buckets (id, name, public)
values ('remarks-sheets', 'remarks-sheets', false)
on conflict (id) do nothing;

create table public.remarks_sheet_sends (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registrant_email text not null,
  registration_ids uuid[] not null,
  -- Test sends go to the admin's own address and never block the real send.
  is_test boolean not null default false,
  sent_to text not null,
  sent_at timestamptz not null default now()
);

create unique index remarks_sheet_sends_once
  on public.remarks_sheet_sends (event_id, registrant_email)
  where not is_test;

alter table public.remarks_sheet_sends enable row level security;

create policy "Staff read remarks sheet sends" on public.remarks_sheet_sends
  for select to authenticated using (public.can_view_admin());
