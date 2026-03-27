
-- 0. Add staff_level to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS staff_level text DEFAULT 'junior';
UPDATE public.employees SET staff_level = 'managerial' WHERE designation ILIKE '%manager%' OR designation ILIKE '%lead%' OR designation ILIKE '%head%';

-- 1. Create Allowance Rates Table
CREATE TABLE IF NOT EXISTS public.allowance_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location text NOT NULL, -- 'ISL', 'FSL', 'LHR'
  staff_level text NOT NULL, -- 'managerial', 'junior'
  travel_rate numeric DEFAULT 0,
  daily_allowance_rate numeric DEFAULT 0,
  meal_allowance_rate numeric DEFAULT 0,
  incentive_rate numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Create Allowance Claims Table
CREATE TABLE IF NOT EXISTS public.allowance_claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  claim_date date NOT NULL,
  location text NOT NULL,
  staff_level text,
  travel_amount numeric DEFAULT 0,
  daily_allowance numeric DEFAULT 0,
  meal_allowance numeric DEFAULT 0,
  incentive_amount numeric DEFAULT 0,
  total_amount numeric GENERATED ALWAYS AS (travel_amount + daily_allowance + meal_allowance + incentive_amount) STORED,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reason text,
  payroll_period_id uuid, -- Reference to payroll_periods if needed
  approved_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.allowance_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable access for all" ON public.allowance_rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all" ON public.allowance_claims FOR ALL USING (true) WITH CHECK (true);

-- 4. Seed Default Rates
INSERT INTO public.allowance_rates (location, staff_level, travel_rate, daily_allowance_rate, meal_allowance_rate, incentive_rate)
VALUES 
('ISL', 'managerial', 2000, 1500, 1000, 500),
('ISL', 'junior', 1000, 800, 500, 200),
('FSL', 'managerial', 1800, 1300, 900, 400),
('FSL', 'junior', 900, 700, 450, 150),
('LHR', 'managerial', 2200, 1700, 1100, 600),
('LHR', 'junior', 1100, 900, 600, 300)
ON CONFLICT DO NOTHING;
