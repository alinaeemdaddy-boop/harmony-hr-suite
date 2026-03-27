-- =============================================================
-- 1. Modules & Access Control Setup
-- =============================================================

-- Create Modules Table
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  key text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed Default Modules
INSERT INTO public.modules (name, key, description) VALUES
('Attendance', 'attendance', 'Track employee attendance, check-ins, and work hours'),
('Payroll', 'payroll', 'Manage salaries, payslips, and tax deductions'),
('Leaves', 'leaves', 'Leave management and approval workflows'),
('Recruitment', 'recruitment', 'Job postings and candidate tracking'),
('Performance', 'performance', 'Employee performance reviews and goals'),
('Expenses', 'expenses', 'Expense claims and reimbursements'),
('Reports', 'reports', 'System-wide analytics and reporting')
ON CONFLICT (key) DO NOTHING;

-- User-Module Assignments
CREATE TABLE IF NOT EXISTS public.user_modules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.app_users(id) on delete cascade not null,
  module_id uuid references public.modules(id) on delete cascade not null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  assigned_by uuid references public.app_users(id),
  unique(user_id, module_id)
);

-- =============================================================
-- 2. Secure RPCs for Admin Management (SECURITY DEFINER)
-- =============================================================

-- RPC: Get all users with modules
DROP FUNCTION IF EXISTS public.get_admin_users_list();
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  role text,
  is_active boolean,
  last_login timestamp with time zone,
  assigned_modules jsonb
) 
SECURITY DEFINER -- Run as database owner
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.full_name,
    u.role,
    u.is_active,
    u.last_login,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'key', m.key))
        FROM public.user_modules um
        JOIN public.modules m ON m.id = um.module_id
        WHERE um.user_id = u.id
      ),
      '[]'::jsonb
    ) as assigned_modules
  FROM public.app_users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- RPC: Create User
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text, uuid[]);
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_username text,
  p_password_hash text,
  p_full_name text,
  p_role text,
  p_module_ids uuid[]
)
RETURNS jsonb 
SECURITY DEFINER -- Run as database owner
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_mod_id uuid;
BEGIN
  -- 1. Create User
  INSERT INTO public.app_users (username, password_hash, full_name, role, is_active)
  VALUES (p_username, p_password_hash, p_full_name, p_role, true)
  RETURNING id INTO v_user_id;

  -- 2. Assign Modules
  IF p_module_ids IS NOT NULL THEN
    FOREACH v_mod_id IN ARRAY p_module_ids
    LOOP
      INSERT INTO public.user_modules (user_id, module_id)
      VALUES (v_user_id, v_mod_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- RPC: Update User
DROP FUNCTION IF EXISTS public.admin_update_user(uuid, text, text, uuid[], boolean, text);
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_module_ids uuid[],
  p_is_active boolean,
  p_password_hash text DEFAULT NULL
)
RETURNS jsonb 
SECURITY DEFINER -- Run as database owner
SET search_path = public
AS $$
DECLARE
  v_mod_id uuid;
BEGIN
  -- 1. Update User Fields
  UPDATE public.app_users
  SET 
    full_name = p_full_name,
    role = p_role,
    is_active = p_is_active,
    password_hash = COALESCE(p_password_hash, password_hash)
  WHERE id = p_user_id;

  -- 2. Update Modules (Wipe and Replace)
  DELETE FROM public.user_modules WHERE user_id = p_user_id;

  IF p_module_ids IS NOT NULL THEN
    FOREACH v_mod_id IN ARRAY p_module_ids
    LOOP
      INSERT INTO public.user_modules (user_id, module_id)
      VALUES (p_user_id, v_mod_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- 3. Initial Access Assignment for Admin
-- =============================================================
DO $$
DECLARE
  v_admin_id uuid;
  v_mod record;
BEGIN
  SELECT id INTO v_admin_id FROM public.app_users WHERE username = 'admin' LIMIT 1;
  IF v_admin_id IS NOT NULL THEN
    FOR v_mod IN SELECT id FROM public.modules LOOP
      INSERT INTO public.user_modules (user_id, module_id)
      VALUES (v_admin_id, v_mod.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- =============================================================
-- 4. Enable Access / RLS Policies
-- =============================================================

-- Modules: Read-only for all (frontend needs to list them)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all on modules" ON public.modules;
CREATE POLICY "Enable read access for all on modules" ON public.modules FOR SELECT USING (true);

-- User Modules: Read-only for all (needed for checking permissions)
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all on user_modules" ON public.user_modules;
CREATE POLICY "Enable read access for all on user_modules" ON public.user_modules FOR SELECT USING (true);

-- Allow Insert/Update/Delete mainly via RPC (SECURITY DEFINER handles it), 
-- but if we need a fallback for anon (since AuthContext is client-side only):
-- STRICTLY SPEAKING: RPCs with SECURITY DEFINER will work even if these are absent. Not adding write policies ensures safety.
