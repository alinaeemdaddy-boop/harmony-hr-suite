import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Building,
  UserCheck,
  TrendingUp,
  Calendar,
  Clock,
  Store,
  MapPin,
  CalendarClock,
  FileText,
  DollarSign,
  Zap,
  CheckCircle,
  AlertCircle,
  ListPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  employees: { total: number; active: number; newThisMonth: number };
  departments: { total: number };
  branches: { total: number; active: number };
  attendance: { present: number; late: number; absent: number };
  roster: { shiftsToday: number };
  leave: { pending: number; onLeaveToday: number };
  payroll: { lastRunStatus: string; lastRunDate: string | null };
  workflow: { unreadNotifications: number };
  tasks: { pending: number };
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    employees: { total: 0, active: 0, newThisMonth: 0 },
    departments: { total: 0 },
    branches: { total: 0, active: 0 },
    attendance: { present: 0, late: 0, absent: 0 },
    roster: { shiftsToday: 0 },
    leave: { pending: 0, onLeaveToday: 0 },
    payroll: { lastRunStatus: 'N/A', lastRunDate: null },
    workflow: { unreadNotifications: 0 },
    tasks: { pending: 0 },
  });

  useEffect(() => {
    fetchDashboardMetrics();
    if (role === 'super_admin' || role === 'hr_admin') {
      checkExpiringContracts();
    }
  }, [role]);

  const checkExpiringContracts = async () => {
    try {
      await (supabase as any).rpc('check_expiring_contracts');
    } catch (e) {
      console.error('Contract check error:', e);
    }
  };

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // We use Promise.allSettled to ensure one failure doesn't break the whole dashboard
      const results = await Promise.allSettled([
        // 1. Employees
        supabase.from('employees').select('id, status, joining_date'),
        supabase.from('departments').select('id', { count: 'exact', head: true }),
        (supabase as any).from('branches').select('id, status'),
        supabase.from('attendance').select('status').eq('date', today),
        (supabase as any).from('roster_entries').select('id', { count: 'exact', head: true }).eq('date', today),
        supabase.from('leave_requests').select('status, start_date, end_date'),
        supabase.from('payroll_runs').select('status, run_date').order('run_date', { ascending: false }).limit(1),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
        (supabase as any).from('general_tasks').select('id', { count: 'exact', head: true }).in('status', ['todo', 'in_progress'])
      ]);

      const newStats = { ...stats };

      // Process Employees
      if (results[0].status === 'fulfilled' && results[0].value.data) {
        const emps = results[0].value.data;
        newStats.employees.total = emps.length;
        newStats.employees.active = emps.filter(e => e.status === 'active').length;
        newStats.employees.newThisMonth = emps.filter(e => e.joining_date >= startOfMonth.toISOString().split('T')[0]).length;
      }

      // Process Departments
      if (results[1].status === 'fulfilled') {
        newStats.departments.total = results[1].value.count || 0;
      }

      // Process Branches
      if (results[2].status === 'fulfilled' && results[2].value.data) {
        const branches = results[2].value.data as any[];
        newStats.branches.total = branches.length;
        newStats.branches.active = branches.filter((b: any) => b.status === 'active').length;
      }

      // Process Attendance
      if (results[3].status === 'fulfilled' && results[3].value.data) {
        const att = results[3].value.data;
        newStats.attendance.present = att.filter(a => a.status === 'present').length;
        newStats.attendance.late = att.filter(a => a.status === 'late').length;
        newStats.attendance.absent = att.filter(a => a.status === 'absent').length;
      }

      // Process Roster
      if (results[4].status === 'fulfilled') {
        newStats.roster.shiftsToday = results[4].value.count || 0;
      }

      // Process Leave
      if (results[5].status === 'fulfilled' && results[5].value.data) {
        const leaves = results[5].value.data;
        newStats.leave.pending = leaves.filter(l => l.status === 'pending').length;
        // Simple check for "on leave today" (start <= today <= end) and status approved
        newStats.leave.onLeaveToday = leaves.filter(l =>
          l.status === 'approved' &&
          l.start_date <= today &&
          l.end_date >= today
        ).length;
      }

      // Process Payroll
      if (results[6].status === 'fulfilled' && results[6].value.data && results[6].value.data.length > 0) {
        const lastRun = results[6].value.data[0];
        newStats.payroll.lastRunStatus = lastRun.status;
        newStats.payroll.lastRunDate = lastRun.run_date;
      }

      // Process Tasks
      if (results[8].status === 'fulfilled') {
        newStats.tasks.pending = results[8].value.count || 0;
      }

      setStats(newStats);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast({
        title: 'Data Load Error',
        description: 'Partial data loaded due to network or permission issues.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const widgets = [
    {
      title: 'Employees',
      value: stats.employees.active,
      subValue: `${stats.employees.total} Total`,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/employees',
      detail: `${stats.employees.newThisMonth} new this month`
    },
    {
      title: 'Departments',
      value: stats.departments.total,
      subValue: 'Departments',
      icon: Building,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      href: '/departments',
      detail: 'Organizational Units'
    },
    {
      title: 'Branches',
      value: stats.branches.active,
      subValue: `${stats.branches.total} Total`,
      icon: Store,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      href: '/branches',
      detail: 'Active Locations'
    },
    {
      title: 'Attendance',
      value: stats.attendance.present,
      subValue: 'Present Today',
      icon: MapPin,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      href: '/attendance',
      detail: `${stats.attendance.late} Late, ${stats.attendance.absent} Absent`
    },
    {
      title: 'Roster',
      value: stats.roster.shiftsToday,
      subValue: 'Shifts Today',
      icon: CalendarClock,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      href: '/roster',
      detail: 'Daily Schedule'
    },
    {
      title: 'Leave',
      value: stats.leave.pending,
      subValue: 'Pending Requests',
      icon: FileText,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      href: '/leave',
      detail: `${stats.leave.onLeaveToday} on leave today`
    },
    {
      title: 'Payroll',
      value: stats.payroll.lastRunStatus,
      subValue: stats.payroll.lastRunDate ? new Date(stats.payroll.lastRunDate).toLocaleDateString() : 'No runs',
      icon: DollarSign,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      href: '/payroll',
      detail: 'Last Run Status'
    },
    {
      title: 'Workflow',
      value: stats.workflow.unreadNotifications,
      subValue: 'Unread Alerts',
      icon: Zap,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      href: '/workflow',
      detail: 'System Notifications'
    },
    {
      title: 'Tasks',
      value: stats.tasks.pending,
      subValue: 'Active Tasks',
      icon: ListPlus,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      href: '/tasks',
      detail: 'Assigned to Staff'
    }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in pb-8">
        {/* Welcome Section */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card to-muted/20">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
                {getGreeting()}, {user?.full_name || user?.username}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Here's your daily overview across all system modules.
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium p-2 sm:p-3 rounded-lg bg-background/50 border border-border/50 shadow-sm backdrop-blur-sm w-fit">
              <div className="flex items-center gap-1.5 sm:gap-2 text-primary">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {widgets.map((widget, index) => (
            <Card
              key={widget.title}
              className="glass-card-hover border-0 overflow-hidden cursor-pointer group hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(widget.href)}
            >
               <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <div className={`p-3 rounded-xl ${widget.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <widget.icon className={`w-6 h-6 ${widget.color}`} />
                  </div>
                  {/* Subtle chevron or indicator could go here */}
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-bold font-display text-foreground">
                    {loading ? (
                      <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                    ) : (
                      typeof widget.value === 'string' ? <span className="capitalize text-lg">{widget.value}</span> : widget.value
                    )}
                  </h3>
                  <p className="font-medium text-muted-foreground text-sm">
                    {widget.subValue}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    {widget.detail}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-background/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrendingUp className="w-3 h-3 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Health / Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                System Status
              </CardTitle>
              <CardDescription>Real-time module health check</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm font-medium">Database Connection</span>
                  </div>
                  <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full">Optimal</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Last Sync</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle>Role Access</CardTitle>
              <CardDescription>Your current permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {role ? role.substring(0, 2).toUpperCase() : 'EM'}
                </div>
                <div>
                  <h4 className="font-semibold capitalize">{role?.replace('_', ' ') || 'Employee'}</h4>
                  <p className="text-xs text-muted-foreground">Logged in as {user?.username}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {role === 'super_admin' ? (
                  <>
                    <Badge variant="secondary">Full Access</Badge>
                    <Badge variant="secondary">System Config</Badge>
                    <Badge variant="secondary">User Management</Badge>
                  </>
                ) : (
                  <Badge variant="secondary">Standard Access</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}