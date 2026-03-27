-- Create shifts table
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

-- Create roster_entries table
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

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_entries ENABLE ROW LEVEL SECURITY;

-- Policies for shifts
CREATE POLICY "Enable read access for all users" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Enable insert/update/delete for admins" ON public.shifts 
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.app_users 
        WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'manager')
    ));

-- Policies for roster_entries
CREATE POLICY "Enable read access for all users" ON public.roster_entries FOR SELECT USING (true);
CREATE POLICY "Enable insert/update/delete for admins" ON public.roster_entries 
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.app_users 
        WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'manager')
    ));

-- Add some default shifts
INSERT INTO public.shifts (name, start_time, end_time, color)
VALUES 
('Morning Shift', '08:00:00', '16:00:00', 'bg-blue-500'),
('Evening Shift', '16:00:00', '00:00:00', 'bg-emerald-500'),
('Night Shift', '00:00:00', '08:00:00', 'bg-purple-500')
ON CONFLICT DO NOTHING;
