-- =============================================================
-- Onboarding & Offboarding Table Setup
-- =============================================================

-- 0. Roles table (dependency for task_templates)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1. Onboarding case table
CREATE TABLE IF NOT EXISTS public.onboarding_cases (
  case_id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  initiated_by uuid references public.employees(id) not null,
  status text default 'pending' check (status in ('pending','active','completed','rejected','no_show')),
  start_date date not null,
  expected_end_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Offboarding case table
CREATE TABLE IF NOT EXISTS public.offboarding_cases (
  case_id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) not null,
  initiated_by uuid references public.employees(id) not null,
  status text default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  notice_date date,
  last_working_day date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Task templates (used to generate checklists)
CREATE TABLE IF NOT EXISTS public.task_templates (
  template_id uuid default gen_random_uuid() primary key,
  name text not null,
  role_id uuid references public.roles(id),
  branch_id uuid references public.branches(id),
  employment_type text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tasks instantiated from templates for a specific case
CREATE TABLE IF NOT EXISTS public.tasks (
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

-- 5. Approvals for cases (multi‑level)
CREATE TABLE IF NOT EXISTS public.approvals (
  approval_id uuid default gen_random_uuid() primary key,
  case_id uuid references public.onboarding_cases(case_id) on delete cascade,
  approver_id uuid references public.employees(id) not null,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  comment text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Assets catalog
CREATE TABLE IF NOT EXISTS public.assets (
  asset_id uuid default gen_random_uuid() primary key,
  type text not null,
  serial_number text unique,
  model text,
  status text default 'available' check (status in ('available','assigned','returned','repair')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Asset assignments to employees/cases
CREATE TABLE IF NOT EXISTS public.asset_assignments (
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

-- 8. Access requests (email, VPN, ERP, etc.)
CREATE TABLE IF NOT EXISTS public.access_requests (
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

-- 9. Training assignments (mandatory trainings)
CREATE TABLE IF NOT EXISTS public.training_assignments (
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

-- 10. Probation reviews
CREATE TABLE IF NOT EXISTS public.probation_reviews (
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

-- 11. Exit interviews (off‑boarding)
CREATE TABLE IF NOT EXISTS public.exit_interviews (
  interview_id uuid default gen_random_uuid() primary key,
  case_id uuid references public.offboarding_cases(case_id) on delete cascade,
  interviewer_id uuid references public.employees(id) not null,
  interview_date date not null,
  feedback_json jsonb,
  overall_rating integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Final settlements
CREATE TABLE IF NOT EXISTS public.settlements (
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

-- =============================================================
-- Triggers & Automation
-- =============================================================

-- Function to notify admins when a new employee is created (Onboarding starts)
CREATE OR REPLACE FUNCTION public.on_employee_onboarding_start()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
BEGIN
    -- Only trigger if the status is active (new hire)
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        FOR admin_record IN SELECT id as user_id FROM public.app_users WHERE role IN ('super_admin', 'hr_admin') LOOP
            INSERT INTO public.notifications (
                user_id, 
                title, 
                message, 
                type, 
                category, 
                action_url, 
                related_entity_type, 
                related_entity_id
            ) VALUES (
                admin_record.user_id, 
                'New Employee Onboarding', 
                'A new employee ' || NEW.full_name || ' has been added. Please start the onboarding checklist.',
                'info',
                'onboarding',
                '/employees/' || NEW.id,
                'employees',
                NEW.id
            );
        END LOOP;
        
        -- Automatically create an onboarding case
        INSERT INTO public.onboarding_cases (employee_id, initiated_by, status, start_date)
        VALUES (NEW.id, auth.uid(), 'pending', CURRENT_DATE)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for employee creation
DROP TRIGGER IF EXISTS tr_employee_onboarding_start ON public.employees;
CREATE TRIGGER tr_employee_onboarding_start
AFTER INSERT OR UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.on_employee_onboarding_start();

-- Function to notify when onboarding case status changes
CREATE OR REPLACE FUNCTION public.on_case_status_change()
RETURNS TRIGGER AS $$
DECLARE
    emp_record RECORD;
BEGIN
    IF NEW.status != OLD.status THEN
        SELECT full_name, user_id FROM public.employees WHERE id = NEW.employee_id INTO emp_record;
        
        -- Notify the employee if they have a user account
        IF emp_record.user_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id, title, message, type, category
            ) VALUES (
                emp_record.user_id, 
                'Onboarding Update', 
                'Your onboarding status has been updated to ' || NEW.status,
                'info',
                'onboarding'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for onboarding status
DROP TRIGGER IF EXISTS tr_onboarding_status_change ON public.onboarding_cases;
CREATE TRIGGER tr_onboarding_status_change
AFTER UPDATE ON public.onboarding_cases
FOR EACH ROW EXECUTE FUNCTION public.on_case_status_change();

-- =============================================================
-- Row Level Security (RLS) Policies
-- =============================================================

ALTER TABLE public.onboarding_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.probation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Onboarding Cases Policies
DROP POLICY IF EXISTS "Enable all for admins on onboarding" ON public.onboarding_cases;
CREATE POLICY "Enable all for admins on onboarding" ON public.onboarding_cases 
FOR ALL USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin')));

DROP POLICY IF EXISTS "Enable read for own onboarding" ON public.onboarding_cases;
CREATE POLICY "Enable read for own onboarding" ON public.onboarding_cases 
FOR SELECT USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Offboarding Cases Policies
DROP POLICY IF EXISTS "Enable all for admins on offboarding" ON public.offboarding_cases;
CREATE POLICY "Enable all for admins on offboarding" ON public.offboarding_cases 
FOR ALL USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin')));

DROP POLICY IF EXISTS "Enable read for own offboarding" ON public.offboarding_cases;
CREATE POLICY "Enable read for own offboarding" ON public.offboarding_cases 
FOR SELECT USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Tasks Policies
DROP POLICY IF EXISTS "Enable all for admins on tasks" ON public.tasks;
CREATE POLICY "Enable all for admins on tasks" ON public.tasks 
FOR ALL USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin')));

DROP POLICY IF EXISTS "Enable updates for task owners" ON public.tasks;
CREATE POLICY "Enable updates for task owners" ON public.tasks 
FOR UPDATE USING (owner_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Allow authenticated users to create (INSERT) cases and tasks
DROP POLICY IF EXISTS "Enable insert for authenticated users on onboarding" ON public.onboarding_cases;
CREATE POLICY "Enable insert for authenticated users on onboarding" ON public.onboarding_cases FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users on offboarding" ON public.offboarding_cases;
CREATE POLICY "Enable insert for authenticated users on offboarding" ON public.offboarding_cases FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users on tasks" ON public.tasks;
CREATE POLICY "Enable insert for authenticated users on tasks" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
