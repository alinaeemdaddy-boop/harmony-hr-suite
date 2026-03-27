-- Refined notifications table to match existing NotificationCenter expectations
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references auth.users(id)
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'success', 'pending'
    category TEXT DEFAULT 'general', -- 'leave', 'payroll', 'attendance', 'approval', 'contract'
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    related_entity_type TEXT,
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refined employee_contracts table
CREATE TABLE IF NOT EXISTS public.employee_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    contract_type TEXT CHECK (contract_type IN ('employment_contract', 'mou')),
    start_date DATE NOT NULL,
    end_date DATE,
    signed_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated', 'renewed')),
    file_url TEXT,
    salary_basis NUMERIC,
    probation_period_months INTEGER,
    contract_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for employee_contracts
CREATE POLICY "Enable read for authenticated users" ON public.employee_contracts FOR SELECT USING (true);
CREATE POLICY "Enable all for admins" ON public.employee_contracts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);

-- Policies for notifications
CREATE POLICY "Enable read for own notifications" ON public.notifications 
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Enable update for own notifications" ON public.notifications 
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Enable insert for system" ON public.notifications 
    FOR INSERT WITH CHECK (true);

-- Function to check for expiring contracts and create notifications
CREATE OR REPLACE FUNCTION public.check_expiring_contracts() 
RETURNS VOID AS $$
DECLARE
    contract_record RECORD;
    admin_record RECORD;
BEGIN
    FOR contract_record IN 
        SELECT ec.*, e.full_name 
        FROM public.employee_contracts ec
        JOIN public.employees e ON ec.employee_id = e.id
        WHERE ec.status = 'active' 
        AND ec.end_date IS NOT NULL 
        AND ec.end_date <= (CURRENT_DATE + INTERVAL '30 days')
        AND ec.end_date > CURRENT_DATE
    LOOP
        -- Notify all HR admins
        FOR admin_record IN SELECT id as user_id FROM public.app_users WHERE role IN ('super_admin', 'hr_admin') LOOP
            -- Check if notification already exists to avoid duplicates
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE user_id = admin_record.user_id 
                AND category = 'contract'
                AND related_entity_id = contract_record.id
                AND is_read = false
            ) THEN
                INSERT INTO public.notifications (user_id, title, message, type, category, action_url, related_entity_type, related_entity_id)
                VALUES (
                    admin_record.user_id, 
                    'Contract Expiration', 
                    'The ' || contract_record.contract_type || ' for ' || contract_record.full_name || ' expires on ' || contract_record.end_date,
                    'warning',
                    'contract',
                    '/employees/' || contract_record.employee_id,
                    'employee_contracts',
                    contract_record.id
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
