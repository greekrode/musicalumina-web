-- One registration can include several performers (piano duet now, trio or
-- quartet later) while song, video, and payment stay on the registration.
-- participant_count on the category tells the form how many performer rows
-- to collect. Existing participant columns stay so the current solo form
-- keeps working.

alter table public.event_categories
  add column if not exists participant_count smallint not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_categories_participant_count_check'
  ) then
    alter table public.event_categories
      add constraint event_categories_participant_count_check
      check (participant_count between 1 and 4);
  end if;
end $$;

comment on column public.event_categories.participant_count is
  'Performers required on one registration. 1 = solo, 2 = duet.';

update public.event_categories
set participant_count = 2
where name ilike '%piano duet%'
  and participant_count = 1;

create table if not exists public.registration_participants (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  slot smallint not null check (slot >= 1),
  participant_name text not null,
  birth_certificate_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, slot)
);

comment on table public.registration_participants is
  'One row per performer. Song, video, and payment stay on registrations.';

create index if not exists registration_participants_registration_id_idx
  on public.registration_participants (registration_id);

drop trigger if exists update_registration_participants_updated_at
  on public.registration_participants;

create trigger update_registration_participants_updated_at
  before update on public.registration_participants
  for each row
  execute function public.update_updated_at_column();

insert into public.registration_participants (
  registration_id,
  slot,
  participant_name,
  birth_certificate_url
)
select
  r.id,
  1,
  r.participant_name,
  r.birth_certificate_url
from public.registrations r
where r.participant_name is not null
  and not exists (
    select 1
    from public.registration_participants p
    where p.registration_id = r.id
      and p.slot = 1
  );

alter table public.registration_participants enable row level security;

drop policy if exists "Anyone can create registration participants"
  on public.registration_participants;
drop policy if exists "Anyone can read registration participants"
  on public.registration_participants;
drop policy if exists "Admin interface can update registration participants"
  on public.registration_participants;
drop policy if exists "Admin interface can delete registration participants"
  on public.registration_participants;

create policy "Anyone can create registration participants"
  on public.registration_participants
  for insert
  to anon, authenticated
  with check (
    coalesce(current_setting('request.headers', true)::jsonb ->> 'x-admin-role', '') = 'admin'
    or exists (
      select 1
      from public.registrations r
      where r.id = registration_id
        and r.status = 'pending'
    )
  );

create policy "Anyone can read registration participants"
  on public.registration_participants
  for select
  to anon, authenticated
  using (true);

create policy "Admin interface can update registration participants"
  on public.registration_participants
  for update
  to anon, authenticated
  using (
    coalesce(current_setting('request.headers', true)::jsonb ->> 'x-admin-role', '') = 'admin'
  )
  with check (
    coalesce(current_setting('request.headers', true)::jsonb ->> 'x-admin-role', '') = 'admin'
  );

create policy "Admin interface can delete registration participants"
  on public.registration_participants
  for delete
  to anon, authenticated
  using (
    coalesce(current_setting('request.headers', true)::jsonb ->> 'x-admin-role', '') = 'admin'
  );

grant select, insert, update, delete
  on public.registration_participants
  to anon, authenticated;
