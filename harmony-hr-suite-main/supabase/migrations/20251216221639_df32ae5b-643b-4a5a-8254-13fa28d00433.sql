-- Salary Component Types Enum
CREATE TYPE salary_component_type AS ENUM ('earning', 'deduction', 'employer_contribution');

-- Salary Components Table (Basic, Allowances, Deductions)
CREATE TABLE IF NOT EXISTS public.salary_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  type salary_component_type NOT NULL,
  description text,
  is_taxable boolean DEFAULT true,
  is_fixed boolean DEFAULT true,
  calculation_type text DEFAULT 'fixed' CHECK (calculation_type IN ('fixed', 'percentage', 'formula')),
  calculation_base text, -- For percentage: 'basic', 'gross', etc.
  default_value numeric(12,2) DEFAULT 0,
  is_statutory boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Employee Salary Structures (Links employees to their salary components)
CREATE TABLE IF NOT EXISTS public.employee_salary_structures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.salary_components(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  percentage numeric(5,2), -- If calculation_type is percentage
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, component_id, effective_from)
);

-- Pakistan Income Tax Slabs
CREATE TABLE IF NOT EXISTS public.tax_slabs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year text NOT NULL,
  min_income numeric(12,2) NOT NULL,
  max_income numeric(12,2),
  fixed_tax numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Payroll Periods (Monthly tracking)
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  working_days integer,
  status text DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed', 'locked')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

-- Payroll Runs (Processing runs for a period)
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  run_date timestamp with time zone NOT NULL DEFAULT now(),
  run_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'approved', 'paid', 'cancelled')),
  total_gross numeric(14,2) DEFAULT 0,
  total_deductions numeric(14,2) DEFAULT 0,
  total_net numeric(14,2) DEFAULT 0,
  employee_count integer DEFAULT 0,
  notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Payslips (Individual employee payslips)
CREATE TABLE IF NOT EXISTS public.payslips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.payroll_periods(id),
  
  -- Earnings
  basic_salary numeric(12,2) NOT NULL DEFAULT 0,
  gross_earnings numeric(12,2) NOT NULL DEFAULT 0,
  total_allowances numeric(12,2) DEFAULT 0,
  overtime_amount numeric(12,2) DEFAULT 0,
  bonus_amount numeric(12,2) DEFAULT 0,
  
  -- Deductions
  total_deductions numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  provident_fund numeric(12,2) DEFAULT 0,
  eobi_amount numeric(12,2) DEFAULT 0,
  loan_deduction numeric(12,2) DEFAULT 0,
  advance_deduction numeric(12,2) DEFAULT 0,
  leave_deduction numeric(12,2) DEFAULT 0,
  other_deductions numeric(12,2) DEFAULT 0,
  
  -- Net Pay
  net_salary numeric(12,2) NOT NULL DEFAULT 0,
  
  -- Work Details
  working_days integer,
  days_worked integer,
  leaves_taken integer DEFAULT 0,
  unpaid_leaves integer DEFAULT 0,
  overtime_hours numeric(5,2) DEFAULT 0,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'approved', 'paid', 'cancelled')),
  payment_date date,
  payment_reference text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);

-- Payslip Line Items (Detailed breakdown)
CREATE TABLE IF NOT EXISTS public.payslip_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payslip_id uuid NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  component_id uuid REFERENCES public.salary_components(id),
  component_name text NOT NULL,
  component_type salary_component_type NOT NULL,
  amount numeric(12,2) NOT NULL,
  is_taxable boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Salary Advances
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  reason text,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'recovered')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  disbursement_date date,
  recovery_start_period uuid REFERENCES public.payroll_periods(id),
  installments integer DEFAULT 1,
  recovered_amount numeric(12,2) DEFAULT 0,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Reimbursements
CREATE TABLE IF NOT EXISTS public.reimbursements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('travel', 'medical', 'meal', 'communication', 'other')),
  amount numeric(12,2) NOT NULL,
  description text NOT NULL,
  expense_date date NOT NULL,
  receipt_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  processed_in_payroll uuid REFERENCES public.payroll_runs(id),
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salary_components (viewable by all authenticated, managed by admins)
CREATE POLICY "Salary components viewable by authenticated" ON public.salary_components FOR SELECT USING (true);
CREATE POLICY "Salary components managed by admins" ON public.salary_components FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for employee_salary_structures
CREATE POLICY "Employees can view own salary structure" ON public.employee_salary_structures FOR SELECT 
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all salary structures" ON public.employee_salary_structures FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage salary structures" ON public.employee_salary_structures FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for tax_slabs
CREATE POLICY "Tax slabs viewable by authenticated" ON public.tax_slabs FOR SELECT USING (true);
CREATE POLICY "Tax slabs managed by admins" ON public.tax_slabs FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for payroll_periods
CREATE POLICY "Payroll periods viewable by admins" ON public.payroll_periods FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Payroll periods managed by admins" ON public.payroll_periods FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for payroll_runs
CREATE POLICY "Payroll runs viewable by admins" ON public.payroll_runs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Payroll runs managed by admins" ON public.payroll_runs FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for payslips
CREATE POLICY "Employees can view own payslips" ON public.payslips FOR SELECT 
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all payslips" ON public.payslips FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage payslips" ON public.payslips FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for payslip_items
CREATE POLICY "Employees can view own payslip items" ON public.payslip_items FOR SELECT 
  USING (payslip_id IN (SELECT id FROM payslips WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));
CREATE POLICY "Admins can view all payslip items" ON public.payslip_items FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage payslip items" ON public.payslip_items FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for salary_advances
CREATE POLICY "Employees can view own advances" ON public.salary_advances FOR SELECT 
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "Employees can request advances" ON public.salary_advances FOR INSERT 
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all advances" ON public.salary_advances FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage advances" ON public.salary_advances FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for reimbursements
CREATE POLICY "Employees can view own reimbursements" ON public.reimbursements FOR SELECT 
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "Employees can submit reimbursements" ON public.reimbursements FOR INSERT 
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all reimbursements" ON public.reimbursements FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage reimbursements" ON public.reimbursements FOR ALL USING (is_admin(auth.uid()));

-- Insert default salary components for Pakistan
INSERT INTO public.salary_components (name, code, type, description, is_taxable, is_fixed, calculation_type, is_statutory, display_order) VALUES
-- Earnings
('Basic Salary', 'BASIC', 'earning', 'Basic monthly salary', true, true, 'fixed', false, 1),
('House Rent Allowance', 'HRA', 'earning', 'Housing allowance - typically 45% of basic', true, false, 'percentage', false, 2),
('Medical Allowance', 'MEDICAL', 'earning', 'Medical expense allowance', false, true, 'fixed', false, 3),
('Transportation Allowance', 'TRANSPORT', 'earning', 'Conveyance/Transport allowance', false, true, 'fixed', false, 4),
('Utility Allowance', 'UTILITY', 'earning', 'Utility bills allowance', true, true, 'fixed', false, 5),
('Mobile Allowance', 'MOBILE', 'earning', 'Mobile phone allowance', true, true, 'fixed', false, 6),
('Overtime', 'OT', 'earning', 'Overtime payment', true, false, 'formula', false, 7),
('Performance Bonus', 'BONUS', 'earning', 'Performance-based bonus', true, false, 'fixed', false, 8),
('Commission', 'COMMISSION', 'earning', 'Sales commission', true, false, 'fixed', false, 9),
-- Deductions
('Income Tax', 'TAX', 'deduction', 'Pakistan income tax deduction', false, false, 'formula', true, 10),
('Provident Fund (Employee)', 'PF_EMP', 'deduction', 'Employee provident fund contribution', false, false, 'percentage', true, 11),
('EOBI (Employee)', 'EOBI_EMP', 'deduction', 'Employee Old-Age Benefits - 1% of min wage', false, false, 'fixed', true, 12),
('Social Security', 'SS', 'deduction', 'Social Security contribution', false, false, 'percentage', true, 13),
('Loan Repayment', 'LOAN', 'deduction', 'Loan/Advance repayment', false, false, 'fixed', false, 14),
('Leave Without Pay', 'LWP', 'deduction', 'Deduction for unpaid leave', false, false, 'formula', false, 15),
-- Employer Contributions
('Provident Fund (Employer)', 'PF_EMPLOYER', 'employer_contribution', 'Employer provident fund contribution', false, false, 'percentage', true, 16),
('EOBI (Employer)', 'EOBI_EMPLOYER', 'employer_contribution', 'Employer EOBI contribution - 5% of min wage', false, false, 'fixed', true, 17);

-- Insert Pakistan Tax Slabs for FY 2024-25
INSERT INTO public.tax_slabs (fiscal_year, min_income, max_income, fixed_tax, tax_rate, description) VALUES
('2024-25', 0, 600000, 0, 0, 'No tax up to PKR 600,000'),
('2024-25', 600001, 1200000, 0, 2.5, '2.5% on amount exceeding PKR 600,000'),
('2024-25', 1200001, 2200000, 15000, 12.5, 'PKR 15,000 + 12.5% on amount exceeding PKR 1,200,000'),
('2024-25', 2200001, 3200000, 140000, 22.5, 'PKR 140,000 + 22.5% on amount exceeding PKR 2,200,000'),
('2024-25', 3200001, 4100000, 365000, 27.5, 'PKR 365,000 + 27.5% on amount exceeding PKR 3,200,000'),
('2024-25', 4100001, NULL, 612500, 35, 'PKR 612,500 + 35% on amount exceeding PKR 4,100,000');

-- Create triggers for updated_at
CREATE TRIGGER update_salary_components_updated_at BEFORE UPDATE ON public.salary_components FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_employee_salary_structures_updated_at BEFORE UPDATE ON public.employee_salary_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON public.payroll_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON public.payslips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_salary_advances_updated_at BEFORE UPDATE ON public.salary_advances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_reimbursements_updated_at BEFORE UPDATE ON public.reimbursements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();