-- Check-ins are append-only operational events. Keep them separate from the
-- registration lifecycle (`pending`, `approved`, `rejected`).
create table if not exists public.registration_checkins (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by text not null,
  created_at timestamptz not null default now()
);

comment on table public.registration_checkins is
  'One atomic event check-in per registration, written only by the verify-qr Edge Function.';

alter table public.registration_checkins enable row level security;

-- The browser must never read or write check-ins directly. The Edge Function
-- uses the service role, which bypasses RLS after verifying Clerk server-side.
revoke all on table public.registration_checkins from anon, authenticated, public;

create index if not exists registration_checkins_checked_in_at_idx
  on public.registration_checkins (checked_in_at desc);
