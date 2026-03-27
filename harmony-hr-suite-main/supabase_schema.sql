-- Create branches table
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
  status text default 'active' check (status in ('active', 'inactive'))
);

-- Add missing columns to employees table
-- Using do block to check if columns exist before adding to avoid errors in simple SQL editors, 
-- though simple 'ADD COLUMN IF NOT EXISTS' handles most cases in Postgres 9.6+.
-- However, we'll use standard ALTER commands which are generally safe to re-run if we use IF NOT EXISTS.

alter table public.employees 
add column if not exists branch_id uuid references public.branches(id),
add column if not exists salary numeric,
add column if not exists employment_type text,
add column if not exists emergency_contact_name text,
add column if not exists emergency_contact_phone text,
add column if not exists designation text,
add column if not exists date_of_birth date,
add column if not exists gender text,
add column if not exists address text,
add column if not exists city text,
add column if not exists state text,
add column if not exists country text,
add column if not exists postal_code text,
add column if not exists joining_date date,
add column if not exists status text default 'active';


-- Enable RLS on branches (safe to run multiple times, it just enables it)
alter table public.branches enable row level security;

-- Policies for branches
-- Drop existing policies to ensure clean state if re-running
drop policy if exists "Enable read access for authenticated users" on public.branches;
drop policy if exists "Enable insert for admins" on public.branches;
drop policy if exists "Enable update for admins" on public.branches;
drop policy if exists "Enable delete for admins" on public.branches;

create policy "Enable read access for authenticated users"
on public.branches for select
to authenticated
using (true);

create policy "Enable insert for admins"
on public.branches for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role in ('super_admin', 'hr_admin')
  )
);

create policy "Enable update for admins"
on public.branches for update
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role in ('super_admin', 'hr_admin')
  )
);

create policy "Enable delete for admins"
on public.branches for delete
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role in ('super_admin', 'hr_admin')
  )
);

-- Grievances table
create table if not exists public.grievances (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text not null,
  incident_date date not null,
  description text not null,
  documents jsonb, -- store array of file URLs or metadata
  category text not null,
  employee_id uuid references public.employees(id) not null,
  department text,
  urgency text not null check (urgency in ('Low', 'Medium', 'High')),
  status text default 'Pending' check (status in ('Pending', 'In Progress', 'Resolved', 'Closed')),
  assigned_hr_id uuid references public.employees(id),
  comments text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on grievances
alter table public.grievances enable row level security;

-- Policies for grievances
-- Employees can read their own grievances
create policy "employees can read own grievances"
  on public.grievances for select
  to authenticated
  using (employee_id = auth.uid());

-- Employees can insert their own grievances
create policy "employees can insert grievances"
  on public.grievances for insert
  to authenticated
  with check (employee_id = auth.uid());

-- HR admins can read all grievances
create policy "hr admins can read all grievances"
  on public.grievances for select
  to authenticated
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('super_admin', 'hr_admin')
  ));

-- HR admins can update status and assign HR reps
create policy "hr admins can update grievances"
  on public.grievances for update
  to authenticated
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('super_admin', 'hr_admin')
  ));

-- HR admins can delete grievances if needed
create policy "hr admins can delete grievances"
  on public.grievances for delete
  to authenticated
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('super_admin', 'hr_admin')
  ));

-- =============================================================
-- Onboarding & Offboarding Core Tables
-- =============================================================

-- Onboarding case table
create table if not exists public.onboarding_cases (
  case_id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  initiated_by uuid references public.employees(id) not null,
  status text default 'pending' check (status in ('pending','active','completed','rejected','no_show')),
  start_date date not null,
  expected_end_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Offboarding case table
create table if not exists public.offboarding_cases (
  case_id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  initiated_by uuid references public.employees(id) not null,
  status text default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  notice_date date,
  last_working_day date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Task templates (used to generate checklists)
create table if not exists public.task_templates (
  template_id uuid default gen_random_uuid() primary key,
  name text not null,
  role_id uuid references public.roles(id),
  branch_id uuid references public.branches(id),
  employment_type text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks instantiated from templates for a specific case
create table if not exists public.tasks (
  task_id uuid default gen_random_uuid() primary key,
  case_id uuid references public.onboarding_cases(case_id) on delete cascade,
  template_id uuid references public.task_templates(template_id),
  title text not null,
  description text,
  owner_id uuid references public.employees(id),
  due_date date,
  status text default 'pending' check (status in ('pending','in_progress','done','blocked')),
  dependency_task_id uuid references public.tasks(task_id),
  evidence_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Approvals for cases (multi‑level)
create table if not exists public.approvals (
  approval_id uuid default gen_random_uuid() primary key,
  case_id uuid references public.onboarding_cases(case_id) on delete cascade,
  approver_id uuid references public.employees(id) not null,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  comment text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Assets catalog
create table if not exists public.assets (
  asset_id uuid default gen_random_uuid() primary key,
  type text not null,
  serial_number text unique,
  model text,
  status text default 'available' check (status in ('available','assigned','returned','repair')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Asset assignments to employees/cases
create table if not exists public.asset_assignments (
  assignment_id uuid default gen_random_uuid() primary key,
  asset_id uuid references public.assets(asset_id),
  employee_id uuid references public.employees(id),
  case_id uuid references public.onboarding_cases(case_id),
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  returned_at timestamp with time zone,
  condition_on_return text,
  handover_form_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Access requests (email, VPN, ERP, etc.)
create table if not exists public.access_requests (
  request_id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  system text not null,
  requested_by uuid references public.employees(id) not null,
  status text default 'pending' check (status in ('pending','granted','denied')),
  approval_id uuid references public.approvals(approval_id),
  granted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Training assignments (mandatory trainings)
create table if not exists public.training_assignments (
  training_id uuid default gen_random_uuid() primary key,
  case_id uuid references public.onboarding_cases(case_id) on delete cascade,
  title text not null,
  due_date date,
  status text default 'pending' check (status in ('pending','completed','failed')),
  completion_date date,
  certificate_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Probation reviews
create table if not exists public.probation_reviews (
  review_id uuid default gen_random_uuid() primary key,
  case_id uuid references public.onboarding_cases(case_id) on delete cascade,
  manager_id uuid references public.employees(id) not null,
  start_date date not null,
  end_date date not null,
  rating integer,
  comments text,
  extension_requested boolean default false,
  extension_approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Exit interviews (off‑boarding)
create table if not exists public.exit_interviews (
  interview_id uuid default gen_random_uuid() primary key,
  case_id uuid references public.offboarding_cases(case_id) on delete cascade,
  interviewer_id uuid references public.employees(id) not null,
  interview_date date not null,
  feedback_json jsonb,
  overall_rating integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Final settlements
create table if not exists public.settlements (
  settlement_id uuid default gen_random_uuid() primary key,
  case_id uuid references public.offboarding_cases(case_id) on delete cascade,
  gross_amount numeric not null,
  deductions_json jsonb,
  net_amount numeric not null,
  approved_by uuid references public.employees(id),
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on new tables (optional – can be added later as needed)
alter table public.onboarding_cases enable row level security;
alter table public.offboarding_cases enable row level security;
alter table public.tasks enable row level security;
alter table public.approvals enable row level security;
alter table public.assets enable row level security;
alter table public.asset_assignments enable row level security;
alter table public.access_requests enable row level security;
alter table public.training_assignments enable row level security;
alter table public.probation_reviews enable row level security;
alter table public.exit_interviews enable row level security;
alter table public.settlements enable row level security;

-- Policies (example for onboarding_cases – similar policies should be created for each table)
create policy "hr_admins_can_read_onboarding" on public.onboarding_cases for select to authenticated using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('super_admin','hr_admin'))
);
create policy "hr_admins_can_update_onboarding" on public.onboarding_cases for update to authenticated using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('super_admin','hr_admin'))
);
create policy "hr_admins_can_insert_onboarding" on public.onboarding_cases for insert to authenticated with check (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('super_admin','hr_admin'))
);
