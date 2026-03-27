-- Add new deduction columns to payslips table
ALTER TABLE public.payslips 
ADD COLUMN IF NOT EXISTS health_insurance_deduction numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_security_deduction numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_deduction numeric DEFAULT 0;

-- Create payroll audit log table for tracking all payroll activities
CREATE TABLE IF NOT EXISTS public.payroll_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL, -- 'payroll_run', 'payslip_generated', 'advance_approved', 'reimbursement_processed', etc.
  action_description text NOT NULL,
  entity_type text NOT NULL, -- 'payroll_run', 'payslip', 'salary_advance', 'reimbursement', etc.
  entity_id uuid,
  employee_id uuid REFERENCES public.employees(id),
  period_id uuid REFERENCES public.payroll_periods(id),
  old_values jsonb,
  new_values jsonb,
  amount numeric,
  performed_by uuid,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_action_type ON public.payroll_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_entity_type ON public.payroll_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_employee_id ON public.payroll_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_period_id ON public.payroll_audit_logs(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_created_at ON public.payroll_audit_logs(created_at DESC);

-- Add employee_loan_deductions table for tracking loan repayments
CREATE TABLE IF NOT EXISTS public.employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  loan_type text NOT NULL, -- 'personal', 'house', 'car', 'education', etc.
  loan_amount numeric NOT NULL,
  interest_rate numeric DEFAULT 0,
  total_installments integer NOT NULL,
  completed_installments integer DEFAULT 0,
  monthly_deduction numeric NOT NULL,
  remaining_amount numeric NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  approved_by uuid,
  approved_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add employee health insurance tracking
CREATE TABLE IF NOT EXISTS public.employee_health_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  plan_name text NOT NULL,
  provider text,
  coverage_type text NOT NULL, -- 'self', 'family', 'parents'
  monthly_premium numeric NOT NULL,
  employee_contribution numeric NOT NULL,
  employer_contribution numeric DEFAULT 0,
  dependents_count integer DEFAULT 0,
  start_date date NOT NULL,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add social security configuration
CREATE TABLE IF NOT EXISTS public.social_security_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate numeric NOT NULL, -- percentage
  ceiling_amount numeric, -- maximum salary for calculation
  employer_rate numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  fiscal_year text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default social security config for Pakistan
INSERT INTO public.social_security_config (name, rate, ceiling_amount, employer_rate, is_active, fiscal_year)
VALUES 
  ('Punjab Social Security', 5.0, 32500, 7.0, true, '2024-25'),
  ('Sindh Social Security', 5.0, 32500, 7.0, true, '2024-25')
ON CONFLICT DO NOTHING;