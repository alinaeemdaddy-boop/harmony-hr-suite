-- Create employee_documents table
CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'pdf', 'ppt', 'word'
  document_category TEXT NOT NULL DEFAULT 'general', -- 'information', 'presentation', 'profile', 'general'
  file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Documents viewable by authenticated users" 
ON public.employee_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Documents manageable by admins" 
ON public.employee_documents 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Employees can view own documents" 
ON public.employee_documents 
FOR SELECT 
USING (employee_id IN (
  SELECT id FROM employees WHERE user_id = auth.uid()
));

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents', 
  'employee-documents', 
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies
CREATE POLICY "Employee documents are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated users can upload employee documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated users can update employee documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated users can delete employee documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-documents');