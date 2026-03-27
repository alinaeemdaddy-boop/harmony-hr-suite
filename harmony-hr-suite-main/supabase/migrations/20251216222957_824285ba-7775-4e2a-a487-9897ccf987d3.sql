-- Create geofences table for office locations
CREATE TABLE public.geofences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_corrections table for employee correction requests
CREATE TABLE public.attendance_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
  correction_type TEXT NOT NULL, -- 'missed_checkin', 'missed_checkout', 'wrong_time', 'other'
  requested_check_in TIMESTAMP WITH TIME ZONE,
  requested_check_out TIMESTAMP WITH TIME ZONE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to attendance table for geofencing
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS geofence_id UUID REFERENCES public.geofences(id),
ADD COLUMN IF NOT EXISTS is_within_geofence BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS device_info TEXT,
ADD COLUMN IF NOT EXISTS check_in_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS check_in_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS check_out_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS check_out_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS check_in_accuracy NUMERIC,
ADD COLUMN IF NOT EXISTS check_out_accuracy NUMERIC;

-- Enable RLS on geofences
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- Policies for geofences
CREATE POLICY "Geofences viewable by authenticated users"
ON public.geofences
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage geofences"
ON public.geofences
FOR ALL
USING (is_admin(auth.uid()));

-- Enable RLS on attendance_corrections
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_corrections
CREATE POLICY "Employees can view own corrections"
ON public.attendance_corrections
FOR SELECT
USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Employees can create own corrections"
ON public.attendance_corrections
FOR INSERT
WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all corrections"
ON public.attendance_corrections
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage corrections"
ON public.attendance_corrections
FOR ALL
USING (is_admin(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_geofences_updated_at
BEFORE UPDATE ON public.geofences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_attendance_corrections_updated_at
BEFORE UPDATE ON public.attendance_corrections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert a default office geofence (example - Pakistan coordinates)
INSERT INTO public.geofences (name, description, latitude, longitude, radius_meters, address, is_default)
VALUES ('Main Office', 'Headquarters location', 24.8607, 67.0011, 200, 'Karachi, Pakistan', true);