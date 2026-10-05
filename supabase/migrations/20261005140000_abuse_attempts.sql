-- Per-IP throttle shared by the public edge functions (video-submission,
-- send-contact-email). Service role only: RLS on, no policies.
create table if not exists public.abuse_attempts (
  id bigint generated always as identity primary key,
  bucket text not null,
  client_ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists abuse_attempts_lookup_idx on public.abuse_attempts (bucket, client_ip, created_at desc);
alter table public.abuse_attempts enable row level security;
revoke all on table public.abuse_attempts from anon, authenticated;
