-- Create admin_users table to store admin emails
create table admin_users (
  id uuid references auth.users on delete cascade,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Enable RLS on admin_users
alter table admin_users enable row level security;

-- Allow admins to view admin_users
create policy "Admins can view admin users"
  on admin_users for select
  using (auth.uid() in (select id from admin_users));

-- Events table policies
create policy "Admins can do all on events"
  on events for all
  using (auth.uid() in (select id from admin_users));

-- Registrations table policies
create policy "Admins can do all on registrations"
  on registrations for all
  using (auth.uid() in (select id from admin_users));

-- Event categories table policies
create policy "Admins can do all on event categories"
  on event_categories for all
  using (auth.uid() in (select id from admin_users));

-- Event subcategories table policies
create policy "Admins can do all on event subcategories"
  on event_subcategories for all
  using (auth.uid() in (select id from admin_users));

-- Event jury table policies
create policy "Admins can do all on event jury"
  on event_jury for all
  using (auth.uid() in (select id from admin_users));

-- Masterclass participants table policies
create policy "Admins can do all on masterclass participants"
  on masterclass_participants for all
  using (auth.uid() in (select id from admin_users));

-- Contact messages table policies
create policy "Admins can do all on contact messages"
  on contact_messages for all
  using (auth.uid() in (select id from admin_users));

-- Function to add an admin user
create or replace function add_admin_user(admin_email text)
returns void as $$
begin
  insert into admin_users (id, email)
  values (
    (select id from auth.users where email = admin_email),
    admin_email
  );
end;
$$ language plpgsql security definer; 