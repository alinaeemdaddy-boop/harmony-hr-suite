
-- Create Role Permissions Table
create table if not exists public.app_permissions (
    id uuid default gen_random_uuid() primary key,
    role text not null, -- 'super_admin', 'hr_admin', 'employee'
    permission_key text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(role, permission_key)
);

-- Disable RLS for manual management
alter table public.app_permissions disable row level security;

-- Seed default permissions
insert into public.app_permissions (role, permission_key)
values 
('super_admin', 'manage_users'),
('super_admin', 'manage_employees'),
('super_admin', 'manage_payroll'),
('super_admin', 'manage_leave'),
('super_admin', 'manage_roster'),
('super_admin', 'view_reports'),
('super_admin', 'system_settings'),

('hr_admin', 'manage_employees'),
('hr_admin', 'manage_payroll'),
('hr_admin', 'manage_leave'),
('hr_admin', 'manage_roster'),
('hr_admin', 'view_reports'),

('employee', 'view_own_profile'),
('employee', 'request_leave'),
('employee', 'mark_attendance')
on conflict do nothing;
