-- Seed Departments
insert into public.departments (name, description) values
('Engineering', 'Software development and IT operations'),
('Human Resources', 'Talent acquisition, employee relations, and payroll'),
('Sales & Marketing', 'Brand awareness, lead generation, and sales'),
('Finance', 'Accounting, auditing, and financial planning');

-- Seed Branches (Real Data)
-- First cleaning up any potential old fake data if running on existing DB is risky, but standard seed assumes fresh or specific constraints.
-- We will just insert the new ones. Ideally one would TRUNCATE but that cascades.
-- Let's assume standard INSERTs.

insert into public.branches (name, city, branch_code, address, status, area, contact_number, email) values
-- Karachi
('Tariq Road', 'Karachi', 'KHI-001', 'Main Tariq Road, PECHS Block 2', 'active', 'PECHS', '021-34567890', 'tariq.road@company.com'),
('DHA Phase 6', 'Karachi', 'KHI-002', 'Khayaban-e-Shahbaz, Phase 6 DHA', 'active', 'DHA', '021-35678901', 'dha.khi@company.com'),
('North Nazimabad', 'Karachi', 'KHI-003', 'Block H, North Nazimabad', 'active', 'North Nazimabad', '021-36789012', 'north.naz@company.com'),
('Gulshan-e-Iqbal', 'Karachi', 'KHI-004', 'University Road, Block 13-C, Gulshan-e-Iqbal', 'active', 'Gulshan-e-Iqbal', '021-34987654', 'gulshan@company.com'),
-- Lahore
('DHA Phase 3', 'Lahore', 'LHR-001', 'Sector Y, DHA Phase 3', 'active', 'DHA', '042-35789012', 'dha.lhr@company.com'),
-- Islamabad
('F-7 Markaz', 'Islamabad', 'ISB-001', 'Jinnah Super Market, F-7 Markaz', 'active', 'F-7', '051-2654321', 'f7.isb@company.com'),
-- USA (New York)
('NYC Headquarters', 'New York', 'USA-NY-001', '350 Fifth Avenue, 59th Floor, New York, NY 10118', 'active', 'Manhattan', '+1-212-555-0199', 'nyc.hq@company.com'),
-- UK (London)
('London Hub', 'London', 'UK-LDN-001', '30 St Mary Axe, London EC3A 8BF', 'active', 'City of London', '+44-20-7946-0958', 'london.hub@company.com');

-- Seed Employees (and assign them to departments/branches)
do $$
declare
  dept_eng uuid;
  dept_hr uuid;
  branch_khi_tariq uuid;
  branch_lhr_dha uuid;
  branch_isb_f7 uuid;
begin
  select id into dept_eng from public.departments where name = 'Engineering' limit 1;
  select id into dept_hr from public.departments where name = 'Human Resources' limit 1;
  select id into branch_khi_tariq from public.branches where branch_code = 'KHI-001' limit 1;
  select id into branch_lhr_dha from public.branches where branch_code = 'LHR-001' limit 1;
  select id into branch_isb_f7 from public.branches where branch_code = 'ISB-001' limit 1;

  -- Verify departments exist, if not create them (safety fallback)
  if dept_eng is null then
    insert into public.departments (name, description) values ('Engineering', 'Software development') returning id into dept_eng;
  end if;
  if dept_hr is null then
    insert into public.departments (name, description) values ('Human Resources', 'HR Management') returning id into dept_hr;
  end if;

  insert into public.employees (
    employee_code, full_name, email, department_id, branch_id, designation, 
    joining_date, status, salary, employment_type, gender, city, phone, address
  ) values
  ('EMP-KHI-001', 'Sarah Ahmed', 'sarah.ahmed@company.com', dept_eng, branch_khi_tariq, 'Senior Software Engineer', '2023-01-15', 'active', 250000, 'Full-time', 'Female', 'Karachi', '0300-1234567', 'PECHS Block 6, Karachi'),
  ('EMP-LHR-001', 'Ali Khan', 'ali.khan@company.com', dept_hr, branch_lhr_dha, 'HR Manager', '2022-05-20', 'active', 180000, 'Full-time', 'Male', 'Lahore', '0321-7654321', 'DHA Phase 5, Lahore'),
  ('EMP-ISB-001', 'Fatima Noor', 'fatima.noor@company.com', dept_eng, branch_isb_f7, 'Frontend Developer', '2023-08-01', 'active', 200000, 'Full-time', 'Female', 'Islamabad', '0333-9876543', 'G-10/4, Islamabad');
end $$;

-- Seed Shifts
insert into public.shifts (name, start_time, end_time, type, color) values
('Morning Standard', '09:00', '18:00', 'fixed', 'bg-blue-500'),
('Evening Support', '14:00', '23:00', 'fixed', 'bg-purple-500'),
('Night Shift', '23:00', '08:00', 'fixed', 'bg-indigo-500');
