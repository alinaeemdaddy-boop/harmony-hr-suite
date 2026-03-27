-- DANGEROUS: This script opens up your database to the public (anon role).
-- Only run this if you want to disable authentication requirements for your app.

-- Helper to enable public access for a table
create or replace function enable_public_access(table_name text) returns void as $$
begin
  execute format('alter table %I enable row level security', table_name);
  execute format('drop policy if exists "Enable access for all" on %I', table_name);
  execute format('drop policy if exists "Enable read access for authenticated users" on %I', table_name);
  execute format('drop policy if exists "Enable insert for admins" on %I', table_name);
  execute format('drop policy if exists "Enable update for admins" on %I', table_name);
  execute format('drop policy if exists "Enable delete for admins" on %I', table_name);
  
  -- Create a policy that allows everything for everyone (anon and authenticated)
  execute format('create policy "Enable access for all" on %I for all using (true) with check (true)', table_name);
end;
$$ language plpgsql;

-- Apply to all tables
select enable_public_access('branches');
select enable_public_access('employees');
select enable_public_access('departments');
select enable_public_access('attendance');
select enable_public_access('leave_requests');
select enable_public_access('leave_balances');
select enable_public_access('leave_types');
select enable_public_access('employee_documents');
select enable_public_access('employee_health_insurance');
select enable_public_access('employee_loans');
select enable_public_access('employee_salary_structures');
select enable_public_access('geofences');
select enable_public_access('holidays');
select enable_public_access('announcements');
select enable_public_access('notifications');

-- Clean up helper function
drop function enable_public_access;
