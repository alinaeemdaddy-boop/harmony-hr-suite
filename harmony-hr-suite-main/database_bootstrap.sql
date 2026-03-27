-- 1. Create Departments Table
create table if not exists public.departments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Employees Table (Core table)
create table if not exists public.employees (
  id uuid default gen_random_uuid() primary key,
  employee_code text unique not null,
  full_name text not null,
  email text not null,
  department_id uuid references public.departments(id),
  designation text,
  joining_date date,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Additional columns used in the app
  phone text,
  avatar_url text,
  salary numeric,
  employment_type text,
  emergency_contact_name text,
  emergency_contact_phone text,
  date_of_birth date,
  gender text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  user_id uuid, -- Link to auth.users if needed
  reporting_manager_id uuid references public.employees(id)
);

-- 3. Create Branches Table (New Feature)
create table if not exists public.branches (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  city text not null,
  area text,
  branch_code text not null unique,
  address text,
  manager_id uuid references public.employees(id),
  contact_number text,
  email text,
  operating_hours text,
  status text default 'active',
  color text
);

-- Add color column if missing (for updates)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'branches' and column_name = 'color') then
    alter table public.branches add column color text;
  end if;
end $$;

-- Add branch_id to employees now that branches exists
alter table public.employees 
add column if not exists branch_id uuid references public.branches(id);

-- 4. Create User Roles (for RLS checks, though we are disabling RLS, the app might query it)
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  role text not null check (role in ('super_admin', 'hr_admin', 'manager', 'employee')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create Attendance Table (Vital for dashboard)
create table if not exists public.attendance (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  date date not null,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  status text,
  work_hours numeric,
  is_within_geofence boolean,
  check_in_location text,
  check_out_location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create Leave Requests Table
create table if not exists public.leave_requests (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  leave_type_id uuid, -- allowing null for simplification
  start_date date not null,
  end_date date not null,
  reason text,
  status text default 'pending',
  total_days numeric,
  half_day boolean default false,
  half_day_type text,
  rejection_reason text,
  document_url text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Create Leave Types Table (Missing in original)
create table if not exists public.leave_types (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  is_paid boolean default true,
  allow_half_day boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Create Payroll Tables (Inferred from Frontend)
create table if not exists public.payroll_periods (
  id uuid default gen_random_uuid() primary key,
  year integer not null,
  month integer not null,
  name text, -- e.g. "January 2024"
  start_date date,
  end_date date,
  is_closed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.payroll_runs (
  id uuid default gen_random_uuid() primary key,
  payroll_period_id uuid references public.payroll_periods(id),
  total_gross numeric default 0,
  total_deductions numeric default 0,
  total_net numeric default 0,
  status text default 'draft', -- draft, processing, completed
  processed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.payslips (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  payroll_period_id uuid references public.payroll_periods(id) not null,
  payroll_run_id uuid references public.payroll_runs(id),
  gross_earnings numeric default 0,
  total_deductions numeric default 0,
  net_salary numeric default 0,
  
  -- Components
  basic_salary numeric default 0,
  allowances numeric default 0,
  
  -- Deductions
  tax_amount numeric default 0,
  eobi_amount numeric default 0,
  provident_fund numeric default 0,
  health_insurance_deduction numeric default 0,
  social_security_deduction numeric default 0,
  advance_deduction numeric default 0,
  loan_deduction numeric default 0,
  other_deductions numeric default 0,
  
  status text default 'generated', -- generated, paid
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Disable RLS / Enable Public Access (Since login is removed)
-- This function enables RLS then drops explicit policies and adds a "allow all" policy
create or replace function enable_public_access(table_name text) returns void as $$
begin
  -- Ensure RLS is enabled so we can attach a policy
  execute format('alter table %I enable row level security', table_name);

  -- Drop restrictive policies
  execute format('drop policy if exists "Enable read access for authenticated users" on %I', table_name);
  execute format('drop policy if exists "Enable insert for admins" on %I', table_name);
  execute format('drop policy if exists "Enable update for admins" on %I', table_name);
  execute format('drop policy if exists "Enable delete for admins" on %I', table_name);
  execute format('drop policy if exists "Enable access for all" on %I', table_name);
  
  -- Create permissive policy
  execute format('create policy "Enable access for all" on %I for all using (true) with check (true)', table_name);
end;
$$ language plpgsql;

-- Apply to tables
select enable_public_access('departments');
select enable_public_access('employees');
select enable_public_access('branches');
select enable_public_access('user_roles');
select enable_public_access('attendance');
select enable_public_access('leave_requests');
select enable_public_access('leave_types');
select enable_public_access('payroll_periods');
select enable_public_access('payroll_runs');
select enable_public_access('payslips');

-- 10. Duty Roster Module

-- Shift Definitions
create table if not exists public.shifts (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- e.g. "Morning Shift", "Night Shift"
  start_time time not null,
  end_time time not null,
  type text default 'fixed', -- fixed, flexible
  color text, -- For UI display
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Roster/Schedule Entries
create table if not exists public.roster_entries (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  shift_id uuid references public.shifts(id) not null,
  date date not null,
  status text default 'published', -- assigned, published, cancelled
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(employee_id, date)
);

-- Shift Swap Requests
create table if not exists public.shift_swap_requests (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.employees(id) not null,
  target_employee_id uuid references public.employees(id), -- Null if open to anyone
  original_roster_entry_id uuid references public.roster_entries(id) not null,
  target_roster_entry_id uuid references public.roster_entries(id), -- If swapping with specific shift
  status text default 'pending', -- pending, approved, rejected
  reason text,
  manager_comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Employee Availability
create table if not exists public.employee_availability (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  day_of_week integer not null, -- 0=Sun, 1=Mon, etc.
  start_time time,
  end_time time,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(employee_id, day_of_week)
);

-- Notifications
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null, -- references auth.users or employees(user_id) but for now just uuid
  title text not null,
  message text,
  type text default 'info', -- success, warning, error, info, pending
  category text default 'system', -- leave, payroll, attendance, approval, roster
  is_read boolean default false,
  read_at timestamp with time zone,
  action_url text,
  related_entity_type text,
  related_entity_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

select enable_public_access('departments');
select enable_public_access('employees');
select enable_public_access('branches');
select enable_public_access('user_roles');
select enable_public_access('attendance');
select enable_public_access('leave_requests');
select enable_public_access('leave_types');
select enable_public_access('payroll_periods');
select enable_public_access('payroll_runs');
select enable_public_access('payslips');
select enable_public_access('shifts');
select enable_public_access('roster_entries');
select enable_public_access('shift_swap_requests');
select enable_public_access('employee_availability');
select enable_public_access('notifications');

-- 11. Payroll & Tax Modules (FBR Compliance)

-- Tax Years
create table if not exists public.tax_years (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- e.g. "2024-2025"
  start_date date not null,
  end_date date not null,
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tax Slabs
create table if not exists public.tax_slabs (
  id uuid default gen_random_uuid() primary key,
  tax_year_id uuid references public.tax_years(id) on delete cascade,
  min_income numeric not null,
  max_income numeric, -- null means infinite
  fixed_tax numeric default 0,
  tax_rate_percent numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Employee Salary Structure
create table if not exists public.employee_salary_structures (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) on delete cascade not null,
  basic_salary numeric default 0,
  house_rent_allowance numeric default 0,
  medical_allowance numeric default 0,
  utilities_allowance numeric default 0,
  special_allowance numeric default 0,
  is_eobi_applicable boolean default true,
  is_sessi_applicable boolean default false,
  provident_fund_percentage numeric default 0,
  effective_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable access for new tables
select enable_public_access('tax_years');
select enable_public_access('tax_slabs');
select enable_public_access('employee_salary_structures');

-- Seed Data: FBR Tax Year 2024-2025
do $$
declare
  ty_id uuid;
begin
  -- Check if year exists, else insert
  if not exists (select 1 from public.tax_years where name = '2024-2025') then
    insert into public.tax_years (name, start_date, end_date, is_active)
    values ('2024-2025', '2024-07-01', '2025-06-30', true)
    returning id into ty_id;

    -- Insert Slabs (Salaried)
    -- 1. Up to 600k: 0
    insert into public.tax_slabs (tax_year_id, min_income, max_income, fixed_tax, tax_rate_percent)
    values (ty_id, 0, 600000, 0, 0);

    -- 2. 600k - 1.2M: 5% of excess
    insert into public.tax_slabs (tax_year_id, min_income, max_income, fixed_tax, tax_rate_percent)
    values (ty_id, 600001, 1200000, 0, 5);

    -- 3. 1.2M - 2.2M: 30k + 15%
    insert into public.tax_slabs (tax_year_id, min_income, max_income, fixed_tax, tax_rate_percent)
    values (ty_id, 1200001, 2200000, 30000, 15);

    -- 4. 2.2M - 3.2M: 180k + 25%
    insert into public.tax_slabs (tax_year_id, min_income, max_income, fixed_tax, tax_rate_percent)
    values (ty_id, 2200001, 3200000, 180000, 25);

    -- 5. 3.2M - 4.1M: 430k + 30%
    insert into public.tax_slabs (tax_year_id, min_income, max_income, fixed_tax, tax_rate_percent)
    values (ty_id, 3200001, 4100000, 430000, 30);

    -- 6. Above 4.1M: 700k + 35%
    insert into public.tax_slabs (tax_year_id, min_income, max_income, fixed_tax, tax_rate_percent)
    values (ty_id, 4100001, null, 700000, 35);
  end if;
end $$;

-- Cleanup
drop function enable_public_access;
