import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hashPassword } from '@/lib/auth';

export type AppRole = 'super_admin' | 'hr_admin' | 'employee';

export interface AppUser {
  id: string;
  username: string;
  full_name: string;
  role: AppRole;
  employee_id?: string;
}

interface AuthContextType {
  user: AppUser | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchDynamicPermissions();

    const reloadHandler = () => fetchDynamicPermissions();
    window.addEventListener('permissions-updated', reloadHandler);
    return () => window.removeEventListener('permissions-updated', reloadHandler);
  }, [role]);

  const fetchDynamicPermissions = async () => {
    if (!role) {
      setPermissions([]);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('app_permissions')
        .select('permission_key')
        .eq('role', role);

      if (error) {
        // Fallback for simple setups or initial boot
        console.warn('App permissions table missing or empty, using fallbacks');
        return;
      }

      setPermissions(data.map(p => p.permission_key));
    } catch (err) {
      console.error('Error fetching dynamic permissions:', err);
    }
  };

  useEffect(() => {
    // Check for persisted session
    const storedUser = localStorage.getItem('harmony_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.id && parsedUser.username) {
          setUser(parsedUser);
          setRole(parsedUser.role);
        } else {
          localStorage.removeItem('harmony_user');
        }
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem('harmony_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const hashedPassword = await hashPassword(password);

      const { data, error } = await (supabase as any)
        .from('app_users')
        .select('*')
        .eq('username', username)
        .eq('password_hash', hashedPassword)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Invalid username or password');

      const appUser: AppUser = {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        role: data.role as AppRole,
        employee_id: data.employee_id
      };

      setUser(appUser);
      setRole(appUser.role);
      localStorage.setItem('harmony_user', JSON.stringify(appUser));

      // Update last login
      await (supabase as any).from('app_users').update({ last_login: new Date().toISOString() }).eq('id', data.id);

      return { error: null };
    } catch (err: any) {
      console.error('Login error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('harmony_user');
  };

  const checkPermission = (permission: string): boolean => {
    // Allow all permissions when no user is logged in (no auth mode)
    if (!role) return true;
    if (role === 'super_admin') return true;

    // Use dynamic permissions from DB if available
    if (permissions.length > 0) {
      return permissions.includes(permission) || permissions.includes('all');
    }

    // Hardcoded Fallbacks (Safety net)
    const fallbacks: Record<AppRole, string[]> = {
      super_admin: ['all'],
      hr_admin: ['view_employees', 'edit_employees', 'manage_payroll', 'manage_leave', 'view_reports', 'manage_roster'],
      employee: ['view_own_profile', 'view_own_payslips', 'view_own_attendance', 'request_leave']
    };

    const rolePermissions = fallbacks[role] || [];
    return rolePermissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut, checkPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}