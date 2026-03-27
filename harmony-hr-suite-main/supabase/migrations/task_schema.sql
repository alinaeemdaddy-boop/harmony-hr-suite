-- Task Management Schema
CREATE TABLE IF NOT EXISTS general_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled', 'blocked')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES employees(id),
  created_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_general_tasks_assigned_to ON general_tasks(assigned_to);
CREATE INDEX idx_general_tasks_status ON general_tasks(status);
CREATE INDEX idx_general_tasks_due_date ON general_tasks(due_date);

-- RLS
ALTER TABLE general_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_employee ON general_tasks FOR SELECT USING (assigned_to = (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY tasks_admin ON general_tasks FOR ALL USING (auth.role() = 'service_role');
