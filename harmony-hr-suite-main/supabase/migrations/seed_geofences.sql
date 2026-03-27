-- Sample Geofence Data for Attendance Testing
-- Run in Supabase SQL Editor or via migration

-- Clear existing (optional)
DELETE FROM public.geofences;

-- Sample Office 1: Main HQ (Karachi)
INSERT INTO public.geofences (name, latitude, longitude, radius_meters, address, is_active, is_default) 
VALUES (
  'Main Office - Karachi', 
  24.8607342, 
  67.0011374, 
  200, 
  'Plot ST-2, Block 3, Scheme No. 36, Gulistan-e-Jauhar, Karachi',
  true, 
  true
);

-- Sample Office 2: Branch Lahore
INSERT INTO public.geofences (name, latitude, longitude, radius_meters, address, is_active, is_default) 
VALUES (
  'Lahore Branch', 
  31.520367, 
  74.358748, 
  300, 
  'Gulberg III, Lahore',
  true, 
  false
);

SELECT 'Geofences seeded successfully!';
