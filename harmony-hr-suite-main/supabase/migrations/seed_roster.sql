-- Seed Roster Data
-- Run after roster_schema.sql

-- Sample Shifts
INSERT INTO shifts (name, start_time, end_time, color, description) VALUES
('Morning Shift', '09:00', '17:00', 'bg-blue-500', 'Standard 8hr day shift'),
('Night Shift', '22:00', '06:00', 'bg-purple-500', 'Overnight security/ER'),
('Evening Shift', '14:00', '22:00', 'bg-emerald-500', 'Afternoon/evening coverage'),
('General Duty', '08:00', '16:00', 'bg-orange-500', 'Flexible general duties'),
('Weekend Day', '10:00', '18:00', 'bg-rose-500', 'Saturday/Sunday coverage');

-- Sample Roster Entries (next week)
DO $$
DECLARE
  emp RECORD;
  shift_id UUID;
  day_date DATE;
BEGIN
  -- Get first 10 employees
  FOR emp IN SELECT id FROM employees LIMIT 10 LOOP
    -- Assign morning shift M-F
    FOR i IN 0..4 LOOP
      day_date := CURRENT_DATE + INTERVAL '7 days' + i;
      SELECT id INTO shift_id FROM shifts WHERE name = 'Morning Shift' LIMIT 1;
      INSERT INTO roster_entries (employee_id, shift_id, date, status) 
      VALUES (emp.id, shift_id, day_date, 'published');
    END LOOP;
    
    -- Weekend evening for some
    IF random() > 0.5 THEN
      day_date := CURRENT_DATE + INTERVAL '9 days'; -- Sat
      SELECT id INTO shift_id FROM shifts WHERE name = 'Weekend Day' LIMIT 1;
      INSERT INTO roster_entries (employee_id, shift_id, date, status) 
      VALUES (emp.id, shift_id, day_date, 'published');
    END IF;
  END LOOP;
END $$;

-- Update types.ts after (supabase gen types)
