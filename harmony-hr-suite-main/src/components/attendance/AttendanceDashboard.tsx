import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  outsideGeofence: number;
  avgWorkHours: number;
}

interface AttendanceRecord {
  date: string;
  status: string;
  is_within_geofence: boolean;
  work_hours: number;
  employee: {
    full_name: string;
  };
}

export function AttendanceDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    outsideGeofence: 0,
    avgWorkHours: 0,
  });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [recentViolations, setRecentViolations] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    // Fetch total employees
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Fetch today's attendance
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', today);

    const presentToday = todayAttendance?.filter(a => a.status === 'present').length || 0;
    const lateToday = todayAttendance?.filter(a => a.status === 'late').length || 0;
    const outsideGeofence = todayAttendance?.filter(a => a.is_within_geofence === false).length || 0;

    // Calculate average work hours for the month
    const { data: monthAttendance } = await supabase
      .from('attendance')
      .select('work_hours')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .not('work_hours', 'is', null);

    const avgWorkHours = monthAttendance?.length 
      ? monthAttendance.reduce((acc, r) => acc + (r.work_hours || 0), 0) / monthAttendance.length
      : 0;

    setStats({
      totalEmployees: totalEmployees || 0,
      presentToday,
      lateToday,
      absentToday: (totalEmployees || 0) - presentToday - lateToday,
      outsideGeofence,
      avgWorkHours: Math.round(avgWorkHours * 10) / 10,
    });

    // Fetch weekly data for chart
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      weekDays.push(format(date, 'yyyy-MM-dd'));
    }

    const { data: weeklyAttendance } = await supabase
      .from('attendance')
      .select('date, status')
      .in('date', weekDays);

    const weeklyStats = weekDays.map(date => {
      const dayRecords = weeklyAttendance?.filter(a => a.date === date) || [];
      return {
        day: format(new Date(date), 'EEE'),
        present: dayRecords.filter(r => r.status === 'present').length,
        late: dayRecords.filter(r => r.status === 'late').length,
        absent: (totalEmployees || 0) - dayRecords.length,
      };
    });

    setWeeklyData(weeklyStats);

    // Fetch recent geofence violations
    const { data: violations } = await supabase
      .from('attendance')
      .select('date, status, is_within_geofence, work_hours, employee:employees(full_name)')
      .eq('is_within_geofence', false)
      .order('date', { ascending: false })
      .limit(5);

    setRecentViolations(violations as AttendanceRecord[] || []);
    setLoading(false);
  };

  const pieData = [
    { name: 'Present', value: stats.presentToday, color: '#10b981' },
    { name: 'Late', value: stats.lateToday, color: '#f59e0b' },
    { name: 'Absent', value: stats.absentToday, color: '#ef4444' },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-3xl font-bold">{stats.totalEmployees}</p>
              </div>
              <Users className="w-10 h-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present Today</p>
                <p className="text-3xl font-bold text-emerald-500">{stats.presentToday}</p>
              </div>
              <UserCheck className="w-10 h-10 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Late Today</p>
                <p className="text-3xl font-bold text-amber-500">{stats.lateToday}</p>
              </div>
              <Clock className="w-10 h-10 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outside Geofence</p>
                <p className="text-3xl font-bold text-red-500">{stats.outsideGeofence}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Attendance Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Weekly Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Bar dataKey="present" fill="#10b981" name="Present" />
                <Bar dataKey="late" fill="#f59e0b" name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Today's Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Today's Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Geofence Violations */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-destructive" />
            Recent Geofence Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentViolations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No geofence violations recorded
            </p>
          ) : (
            <div className="space-y-3">
              {recentViolations.map((violation, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="font-medium">{violation.employee?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(violation.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">Outside Geofence</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Work Hours (This Month)</p>
                <p className="text-3xl font-bold">{stats.avgWorkHours}h</p>
              </div>
              <Clock className="w-10 h-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-3xl font-bold">
                  {stats.totalEmployees > 0 
                    ? Math.round(((stats.presentToday + stats.lateToday) / stats.totalEmployees) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
