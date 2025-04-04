-- Enable RLS on registrations table
alter table registrations enable row level security;

-- Create policy for public read access (only their own registrations)
create policy "Users can view their own registrations"
  on registrations for select
  using (
    auth.uid() in (select id from admin_users) or -- admins can view all
    registrant_email = auth.jwt()->>'email' -- users can view their own
  );

-- Create policy for admin write access
create policy "Only admins can modify registrations"
  on registrations for all
  using (auth.uid() in (select id from admin_users))
  with check (auth.uid() in (select id from admin_users));

-- Create policy for public insert access
create policy "Anyone can create registrations"
  on registrations for insert
  with check (true);

-- Create policy for public update access (only their own registrations)
create policy "Users can update their own pending registrations"
  on registrations for update
  using (
    registrant_email = auth.jwt()->>'email' and
    status = 'pending'
  ); 