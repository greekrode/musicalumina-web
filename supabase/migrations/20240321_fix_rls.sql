-- Drop existing policies
drop policy if exists "Admins can view admin users" on admin_users;
drop policy if exists "Users can view their own registrations" on registrations;
drop policy if exists "Only admins can modify registrations" on registrations;
drop policy if exists "Anyone can create registrations" on registrations;
drop policy if exists "Users can update their own pending registrations" on registrations;

-- Recreate admin_users policies without recursion
create policy "Enable read access for admin users"
  on admin_users for select
  using (auth.jwt()->>'role' = 'authenticated');

-- Recreate registration policies
create policy "Enable read access for all users"
  on registrations for select
  using (true);

create policy "Enable insert for authenticated users"
  on registrations for insert
  with check (auth.role() = 'authenticated');

create policy "Enable update for admins"
  on registrations for update
  using (
    auth.uid() in (
      select id from admin_users
    )
  );

create policy "Enable delete for admins"
  on registrations for delete
  using (
    auth.uid() in (
      select id from admin_users
    )
  );

-- Enable RLS
alter table admin_users enable row level security;
alter table registrations enable row level security;

-- Grant public access to tables
grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

-- Grant access to all tables
grant all on all tables in schema public to anon;
grant all on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Grant access to all sequences
grant all on all sequences in schema public to anon;
grant all on all sequences in schema public to authenticated;
grant all on all sequences in schema public to service_role; 