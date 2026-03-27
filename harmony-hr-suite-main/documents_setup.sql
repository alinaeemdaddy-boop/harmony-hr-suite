-- Create employee_documents table
CREATE TABLE IF NOT EXISTS public.employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_category TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for admins on employee_documents" ON public.employee_documents
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
    );

CREATE POLICY "Enable read for own documents" ON public.employee_documents
    FOR SELECT USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

-- Note: Storage buckets and policies are typically handled via Supabase Dashboard/API
-- but we can ensure the bucket name matches: 'employee-documents'
