-- Create salary_advances table
CREATE TABLE IF NOT EXISTS public.salary_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    installments INTEGER DEFAULT 1,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'recovered', 'completed')),
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.app_users(id),
    rejection_reason TEXT,
    recovered_amount NUMERIC DEFAULT 0,
    disbursement_date TIMESTAMP WITH TIME ZONE,
    recovery_start_period UUID REFERENCES public.payroll_periods(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read for own or admin" ON public.salary_advances 
    FOR SELECT USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
        OR 
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
    );

CREATE POLICY "Enable insert for employees" ON public.salary_advances 
    FOR INSERT WITH CHECK (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

CREATE POLICY "Enable update for admins" ON public.salary_advances 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
    );

-- Create shifts and roster tables (if not already there)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    type TEXT DEFAULT 'fixed',
    color TEXT DEFAULT 'bg-blue-500',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roster_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Add default shifts
INSERT INTO public.shifts (name, start_time, end_time, color)
VALUES 
('Morning Shift', '08:00:00', '16:00:00', 'bg-blue-500'),
('Evening Shift', '16:00:00', '00:00:00', 'bg-emerald-500'),
('Night Shift', '00:00:00', '08:00:00', 'bg-purple-500'),
('Doctor Morning (Full-time)', '09:00:00', '17:00:00', 'bg-rose-500'),
('Doctor Evening (Part-time)', '17:00:00', '21:00:00', 'bg-indigo-500')
ON CONFLICT DO NOTHING;
