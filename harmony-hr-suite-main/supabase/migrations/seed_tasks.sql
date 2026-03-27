-- Seed Tasks
INSERT INTO general_tasks (title, description, assigned_to, priority, due_date, status) VALUES
('Prepare quarterly financial report', 'Compile Q1 data from all departments', (SELECT id FROM employees LIMIT 1), 'high', NOW() + INTERVAL '3 days', 'todo'),
('Review vendor contracts', 'Audit active contracts for renewal', (SELECT id FROM employees LIMIT 1 OFFSET 1), 'medium', NOW() + INTERVAL '7 days', 'in_progress'),
('Setup new office equipment', 'Install and test conference room AV', (SELECT id FROM employees LIMIT 1 OFFSET 2), 'low', NOW() + INTERVAL '2 days', 'todo'),
('Conduct team training session', 'Cybersecurity awareness training', (SELECT id FROM employees LIMIT 1 OFFSET 3), 'urgent', NOW() + INTERVAL '1 day', 'todo'),
('Update employee handbook', 'Incorporate new HR policies', (SELECT id FROM employees LIMIT 1 OFFSET 4), 'medium', NOW() + INTERVAL '10 days', 'completed');
