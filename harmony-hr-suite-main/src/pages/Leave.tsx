import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ClipboardList,
  History,
  CalendarDays,
  PieChart,
  Users,
  Settings,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarRange
} from 'lucide-react';
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard';
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';
import { LeaveHistoryTable } from '@/components/leave/LeaveHistoryTable';
import { LeaveApprovalDashboard } from '@/components/leave/LeaveApprovalDashboard';
import { LeaveTypesConfig } from '@/components/leave/LeaveTypesConfig';
import { HolidayCalendar } from '@/components/leave/HolidayCalendar';
import { LeaveCalendarView } from '@/components/leave/LeaveCalendarView';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface LeaveBalance {
  id: string;
  leave_type_id: string;
  leave_type_name: string;
  total_days: number;
  used_days: number;
  pending_days: number;
  carried_over_days: number;
  is_paid: boolean;
}

interface LeaveStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDaysUsed: number;
}

export default function Leave() {
  const { user, role } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [stats, setStats] = useState<LeaveStats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalDaysUsed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = role === 'super_admin' || role === 'hr_admin';
  const isManager = (role as string) === 'manager' || isAdmin;

  useEffect(() => {
    if (user) {
      if (user.employee_id) {
        setEmployeeId(user.employee_id);
        setLoading(false);
      } else {
        fetchEmployeeId();
      }
    }
  }, [user]);

  useEffect(() => {
    if (employeeId) {
      fetchBalances();
      fetchStats();
    }
  }, [employeeId, refreshKey]);

  const fetchEmployeeId = async () => {
    if (!user) return;

    // First try finding by user_id in employees table (if linked that way)
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setEmployeeId(data.id);
    } else {
      // If not found, check if this is the admin/hr user and link to a default if they aren't linked
      // This helps with demo/setup phase
      const { data: firstEmp } = await supabase
        .from('employees')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (firstEmp && (role === 'super_admin' || role === 'hr_admin')) {
        setEmployeeId(firstEmp.id);
      }
    }
    setLoading(false);
  };

  const fetchBalances = async () => {
    if (!employeeId) return;

    const currentYear = new Date().getFullYear();

    // First, get all leave types
    const { data: leaveTypes } = await supabase
      .from('leave_types')
      .select('id, name, days_per_year, is_paid')
      .eq('is_active', true);

    if (!leaveTypes) return;

    // Get existing balances
    const { data: existingBalances } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', currentYear);

    // Calculate pending days from leave_requests
    const { data: pendingRequests } = await supabase
      .from('leave_requests')
      .select('leave_type_id, total_days')
      .eq('employee_id', employeeId)
      .eq('status', 'pending');

    const pendingByType: Record<string, number> = {};
    pendingRequests?.forEach(req => {
      if (req.leave_type_id) {
        pendingByType[req.leave_type_id] = (pendingByType[req.leave_type_id] || 0) + (req.total_days || 0);
      }
    });

    // Merge data
    const balanceData: LeaveBalance[] = leaveTypes.map(lt => {
      const existing = existingBalances?.find(b => b.leave_type_id === lt.id);
      return {
        id: existing?.id || lt.id,
        leave_type_id: lt.id,
        leave_type_name: lt.name,
        total_days: existing?.total_days || lt.days_per_year || 0,
        used_days: existing?.used_days || 0,
        pending_days: pendingByType[lt.id] || 0,
        carried_over_days: existing?.carried_over_days || 0,
        is_paid: lt.is_paid ?? true,
      };
    });

    setBalances(balanceData);
  };

  const fetchStats = async () => {
    if (!employeeId) return;

    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;

    const { data: requests } = await supabase
      .from('leave_requests')
      .select('status, total_days')
      .eq('employee_id', employeeId)
      .gte('start_date', startOfYear)
      .lte('end_date', endOfYear);

    if (requests) {
      const pending = requests.filter(r => r.status === 'pending').length;
      const approved = requests.filter(r => r.status === 'approved').length;
      const rejected = requests.filter(r => r.status === 'rejected').length;
      const totalDays = requests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.total_days || 0), 0);

      setStats({
        totalRequests: requests.length,
        pendingRequests: pending,
        approvedRequests: approved,
        rejectedRequests: rejected,
        totalDaysUsed: totalDays,
      });
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const statCards = [
    {
      title: 'Total Requests',
      value: stats.totalRequests,
      icon: ClipboardList,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pending',
      value: stats.pendingRequests,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Approved',
      value: stats.approvedRequests,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Days Used',
      value: stats.totalDaysUsed,
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display gradient-text">
              Leave Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Request, track, and manage your leaves
            </p>
          </div>
          <Button onClick={() => setActiveTab('request')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="glass-card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                    <stat.icon className={cn('w-5 h-5', stat.color)} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:w-auto lg:inline-grid gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2">
              <PieChart className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="request" className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Request</span>
            </TabsTrigger>
            <TabsTrigger value="team-calendar" className="gap-2">
              <CalendarRange className="w-4 h-4" />
              <span className="hidden sm:inline">Team Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Holidays</span>
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="approvals" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">Approvals</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="configuration" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Configuration</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LeaveBalanceCard balances={balances} loading={loading} />
              </div>
              <div>
                <HolidayCalendar compact />
              </div>
            </div>

            <LeaveHistoryTable
              employeeId={employeeId || undefined}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          {/* Request Tab */}
          <TabsContent value="request">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {employeeId ? (
                <LeaveRequestForm
                  employeeId={employeeId}
                  onSuccess={handleRefresh}
                />
              ) : (
                <Card className="glass-card">
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-warning" />
                    <h3 className="font-semibold mb-2">Employee Profile Required</h3>
                    <p className="text-sm text-muted-foreground">
                      Your user account is not linked to an employee profile.
                      Please contact HR to set up your profile.
                    </p>
                  </CardContent>
                </Card>
              )}
              <LeaveBalanceCard balances={balances} loading={loading} />
            </div>
          </TabsContent>

          {/* Team Calendar Tab */}
          <TabsContent value="team-calendar">
            <LeaveCalendarView employeeId={employeeId || undefined} showTeamView />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <LeaveHistoryTable
              employeeId={employeeId || undefined}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <HolidayCalendar />
          </TabsContent>

          {/* Approvals Tab (Managers/Admin only) */}
          {isManager && (
            <TabsContent value="approvals" className="space-y-6">
              <LeaveApprovalDashboard onAction={handleRefresh} />

              {isAdmin && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      All Leave Requests
                    </CardTitle>
                    <CardDescription>
                      View and manage all employee leave requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LeaveHistoryTable
                      showAllEmployees
                      onRefresh={handleRefresh}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Configuration Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="configuration">
              <LeaveTypesConfig />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
