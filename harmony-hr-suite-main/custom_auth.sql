
-- 1. Create App Users Table for Custom Auth (No Email)
create table if not exists public.app_users (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  password_hash text not null,
  full_name text not null,
  role text not null check (role in ('super_admin', 'hr_admin', 'employee')),
  employee_id uuid references public.employees(id), -- Link to employee profile if applicable
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login timestamp with time zone,
  is_active boolean default true
);

-- 2. Enable public access (since we are creating our own auth layer)
alter table public.app_users enable row level security;
create policy "Enable access for all" on public.app_users for all using (true) with check (true);

-- 3. Seed Default Admin User
-- Password: "admin" (hashed with simple SHA256 for demo: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918)
-- You can replace this hash with whatever hash function the frontend uses.
-- Let's assume frontend uses: SHA256(password)
insert into public.app_users (username, password_hash, full_name, role)
values 
('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Super Admin', 'super_admin')
on conflict (username) do nothing;

insert into public.app_users (username, password_hash, full_name, role)
values 
('hr', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'HR Manager', 'hr_admin')
on conflict (username) do nothing;
