-- Add carryover and max_carryover_days to leave_types
ALTER TABLE public.leave_types 
ADD COLUMN IF NOT EXISTS allows_carryover boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS max_carryover_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS requires_document boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS min_days_notice integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_consecutive_days integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create leave_balances table to track employee balances
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  total_days numeric(5,2) NOT NULL DEFAULT 0,
  used_days numeric(5,2) NOT NULL DEFAULT 0,
  carried_over_days numeric(5,2) NOT NULL DEFAULT 0,
  pending_days numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Enable RLS on leave_balances
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_balances
CREATE POLICY "Employees can view own balances" ON public.leave_balances
  FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all balances" ON public.leave_balances
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all balances" ON public.leave_balances
  FOR ALL USING (is_admin(auth.uid()));

-- Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  date date NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  is_recurring boolean DEFAULT false,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS policies for holidays
CREATE POLICY "Holidays viewable by authenticated" ON public.holidays
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage holidays" ON public.holidays
  FOR ALL USING (is_admin(auth.uid()));

-- Add document_url to leave_requests for supporting documents
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS half_day boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS half_day_type text CHECK (half_day_type IN ('first_half', 'second_half')),
ADD COLUMN IF NOT EXISTS total_days numeric(5,2);

-- Update leave_types with Pakistan-specific entries
INSERT INTO public.leave_types (name, description, days_per_year, is_paid, allows_carryover, max_carryover_days, requires_document, min_days_notice)
VALUES 
  ('Hajj Leave', 'Leave for performing Hajj pilgrimage (once during service)', 40, true, false, 0, true, 30),
  ('Iddat Leave', 'Leave for Muslim women during Iddat period', 130, true, false, 0, true, 1),
  ('Compensatory Leave', 'Leave in lieu of working on holidays', 0, true, false, 0, false, 1),
  ('Study Leave', 'Leave for educational purposes', 30, false, false, 0, true, 15)
ON CONFLICT DO NOTHING;

-- Update existing leave types with carryover settings
UPDATE public.leave_types SET 
  allows_carryover = true, 
  max_carryover_days = 10,
  min_days_notice = 3
WHERE name = 'Annual Leave';

UPDATE public.leave_types SET 
  requires_document = true,
  min_days_notice = 0
WHERE name = 'Sick Leave';

UPDATE public.leave_types SET 
  requires_document = true,
  min_days_notice = 30
WHERE name IN ('Maternity Leave', 'Paternity Leave');

-- Insert Pakistan public holidays for current year
INSERT INTO public.holidays (name, date, year, is_recurring, description)
VALUES
  ('Kashmir Day', '2025-02-05', 2025, true, 'Kashmir Solidarity Day'),
  ('Pakistan Day', '2025-03-23', 2025, true, 'Republic Day of Pakistan'),
  ('Labour Day', '2025-05-01', 2025, true, 'International Workers Day'),
  ('Independence Day', '2025-08-14', 2025, true, 'Pakistan Independence Day'),
  ('Iqbal Day', '2025-11-09', 2025, true, 'Birth anniversary of Allama Iqbal'),
  ('Quaid-e-Azam Day', '2025-12-25', 2025, true, 'Birth anniversary of Muhammad Ali Jinnah'),
  ('Eid ul-Fitr', '2025-03-31', 2025, false, 'End of Ramadan (3 days)'),
  ('Eid ul-Adha', '2025-06-07', 2025, false, 'Festival of Sacrifice (3 days)'),
  ('Eid Milad-un-Nabi', '2025-09-05', 2025, false, 'Birth of Prophet Muhammad'),
  ('Ashura', '2025-07-06', 2025, false, 'Day of Ashura (2 days)')
ON CONFLICT DO NOTHING;

-- Create updated_at trigger for new tables
CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();