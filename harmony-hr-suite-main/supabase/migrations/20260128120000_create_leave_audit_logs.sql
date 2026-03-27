create table if not exists leave_audit_logs (
  id uuid default gen_random_uuid() primary key,
  leave_request_id uuid references leave_requests(id) on delete cascade not null,
  action text not null,
  performed_by uuid references auth.users(id),
  performed_by_name text,
  performed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table leave_audit_logs enable row level security;

create policy "Admins can view all audit logs"
  on leave_audit_logs for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role in ('super_admin', 'hr_admin')
    )
  );

create policy "Users can view their own request logs"
  on leave_audit_logs for select
  using (
    exists (
      select 1 from leave_requests
      where id = leave_audit_logs.leave_request_id
      and employee_id in (
        select id from employees where user_id = auth.uid()
      )
    )
  );

create policy "System can insert audit logs"
  on leave_audit_logs for insert
  with check (true);
