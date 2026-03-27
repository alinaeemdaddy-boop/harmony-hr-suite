-- Create task_categories table
CREATE TABLE IF NOT EXISTS public.task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create general_tasks table (distinct from onboarding tasks)
CREATE TABLE IF NOT EXISTS public.general_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.app_users(id),
    due_date DATE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled', 'blocked')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for task_categories
CREATE POLICY "Enable read for all authenticated" ON public.task_categories FOR SELECT USING (true);
CREATE POLICY "Enable all for admins" ON public.task_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);

-- Policies for general_tasks
CREATE POLICY "Enable read for assigned or admin" ON public.general_tasks 
    FOR SELECT USING (
        assigned_to IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
        OR 
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
    );

CREATE POLICY "Enable insert for admins" ON public.general_tasks 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
    );

CREATE POLICY "Enable update for admins or status update for assigned" ON public.general_tasks 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
        OR 
        assigned_to IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

-- Seed some categories
INSERT INTO public.task_categories (name, color) VALUES 
('Operations', '#3b82f6'),
('Maintenance', '#10b981'),
('Administrative', '#6366f1'),
('Urgent Fix', '#ef4444')
ON CONFLICT (name) DO NOTHING;
