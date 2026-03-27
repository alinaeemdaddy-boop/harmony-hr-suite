
-- 1. Create Leave Types Table
create table if not exists public.leave_types (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  days_per_year integer default 0,
  is_paid boolean default true,
  requires_document boolean default false,
  allows_carryover boolean default false,
  max_carryover_days integer default 0,
  min_days_notice integer default 0,
  max_consecutive_days integer,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Leave Balances Table
create table if not exists public.leave_balances (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) on delete cascade not null,
  leave_type_id uuid references public.leave_types(id) on delete cascade not null,
  year integer not null,
  total_days numeric default 0,
  used_days numeric default 0,
  pending_days numeric default 0,
  carried_over_days numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(employee_id, leave_type_id, year)
);

-- 3. Create Leave Audit Logs Table
create table if not exists public.leave_audit_logs (
  id uuid default gen_random_uuid() primary key,
  leave_request_id uuid references public.leave_requests(id) on delete cascade not null,
  action text not null,
  performed_by uuid, -- can be auth.users(id)
  performed_by_name text,
  performed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Ensure leave_requests table has all needed columns (if somehow it was created partially)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'leave_requests' and column_name = 'half_day') then
    alter table public.leave_requests add column half_day boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'leave_requests' and column_name = 'half_day_type') then
    alter table public.leave_requests add column half_day_type text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'leave_requests' and column_name = 'total_days') then
    alter table public.leave_requests add column total_days numeric;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'leave_requests' and column_name = 'leave_type_id') then
    alter table public.leave_requests add column leave_type_id uuid references public.leave_types(id);
  end if;
end $$;

-- 5. Enable Row Level Security (RLS) on new tables
alter table public.leave_types enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_audit_logs enable row level security;

-- 6. Create "Allow All" policies (following the project's bootstrap pattern)
create policy "Enable access for all" on public.leave_types for all using (true) with check (true);
create policy "Enable access for all" on public.leave_balances for all using (true) with check (true);
create policy "Enable access for all" on public.leave_audit_logs for all using (true) with check (true);

-- 7. Seed Default Leave Types
insert into public.leave_types (name, description, days_per_year, is_paid, requires_document, min_days_notice, max_consecutive_days)
values 
('Annual Leave', 'Vacation and personal time off', 14, true, false, 7, 14),
('Sick Leave', 'Medical leave for illness or injury', 10, true, true, 0, null),
('Casual Leave', 'Short-term leave for urgent personal matters', 7, true, false, 1, 3),
('Maternity Leave', 'Leave for expectant mothers', 90, true, true, 30, 90),
('Paternity Leave', 'Leave for new fathers', 7, true, true, 15, 7),
('Unpaid Leave', 'Leave without salary', 0, false, false, 14, null)
on conflict (name) do update set 
  description = excluded.description,
  days_per_year = excluded.days_per_year;

-- 8. Seed Sample Balances for existing employees
do $$
declare
  emp record;
  lt record;
  current_year integer := extract(year from now());
begin
  for emp in select id from public.employees loop
    for lt in select id, days_per_year from public.leave_types loop
      insert into public.leave_balances (employee_id, leave_type_id, year, total_days, used_days, pending_days)
      values (emp.id, lt.id, current_year, lt.days_per_year, 0, 0)
      on conflict (employee_id, leave_type_id, year) do nothing;
    end loop;
  end loop;
end $$;
