-- Roster Schema
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color VARCHAR(50) DEFAULT 'bg-blue-500',
  type VARCHAR(50) DEFAULT 'fixed',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roster_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id),
  date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Indexes
CREATE INDEX idx_roster_entries_date ON roster_entries(date);
CREATE INDEX idx_roster_entries_employee ON roster_entries(employee_id);
CREATE INDEX idx_roster_entries_status ON roster_entries(status);

-- RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_entries ENABLE ROW LEVEL SECURITY;

-- Policies (admin full access, employees view own)
CREATE POLICY shifts_admin ON shifts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY roster_employee ON roster_entries FOR SELECT USING (employee_id = (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY roster_admin ON roster_entries FOR ALL USING (auth.role() = 'service_role');
