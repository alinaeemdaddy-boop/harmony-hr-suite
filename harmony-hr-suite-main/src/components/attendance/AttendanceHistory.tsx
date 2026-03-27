import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History, Search, Download, MapPin, Clock, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface AttendanceHistoryProps {
  employeeId: string | null;
  showAllEmployees?: boolean;
}

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  work_hours: number | null;
  is_within_geofence: boolean | null;
  check_in_location: string | null;
  check_out_location: string | null;
  employee?: {
    full_name: string;
    employee_code: string;
    branch_id?: string;
  };
}

export function AttendanceHistory({ employeeId, showAllEmployees }: AttendanceHistoryProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('current');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [branches, setBranches] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [employeeId, showAllEmployees, selectedMonth, statusFilter, branchFilter]);

  const fetchBranches = async () => {
    const { data } = await (supabase as any).from('branches').select('id, name');
    setBranches(data || []);
  };

  const getDateRange = () => {
    const now = new Date();
    switch (selectedMonth) {
      case 'current':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'previous':
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case 'last3':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchAttendanceHistory = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    let query = supabase
      .from('attendance')
      .select(`
        *,
        employee:employees(full_name, employee_code)
      `)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))
      .order('date', { ascending: false });

    if (!showAllEmployees && employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Client-side filtering for branch since deep filtering on joined table is complex in one go with current types
    // Or we can rely on client side filter if dataset is small, but let's try to filter in loop
    // Actually, 'employee.branch_id' filtering in Supabase syntax:
    if (branchFilter !== 'all') {
      // Filter post-fetch for simplicity if RLS allows, or use inner join syntax
      // For now, let's filter after fetch as we already fetch linked employee
    }

    const { data } = await query;
    let fetchedRecords = (data || []) as unknown as AttendanceRecord[];

    if (branchFilter !== 'all') {
      fetchedRecords = fetchedRecords.filter(r => r.employee?.branch_id === branchFilter);
    }

    setRecords(fetchedRecords);
    setLoading(false);
  };

  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      record.employee?.full_name?.toLowerCase().includes(searchLower) ||
      record.employee?.employee_code?.toLowerCase().includes(searchLower) ||
      record.date.includes(searchTerm)
    );
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-emerald-600">Present</Badge>;
      case 'late':
        return <Badge variant="destructive">Late</Badge>;
      case 'absent':
        return <Badge variant="secondary">Absent</Badge>;
      case 'half_day':
        return <Badge className="bg-amber-600">Half Day</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const formatWorkHours = (hours: number | null) => {
    if (!hours) return '--';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Employee', 'Code', 'Check In', 'Check Out', 'Status', 'Work Hours', 'In Geofence'];
    const rows = filteredRecords.map(r => [
      r.date,
      r.employee?.full_name || '',
      r.employee?.employee_code || '',
      r.check_in ? format(new Date(r.check_in), 'hh:mm a') : '',
      r.check_out ? format(new Date(r.check_out), 'hh:mm a') : '',
      r.status || '',
      r.work_hours?.toFixed(2) || '',
      r.is_within_geofence ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Calculate summary stats
  const totalDays = filteredRecords.length;
  const presentDays = filteredRecords.filter(r => r.status === 'present').length;
  const lateDays = filteredRecords.filter(r => r.status === 'late').length;
  const totalHours = filteredRecords.reduce((acc, r) => acc + (r.work_hours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalDays}</div>
            <p className="text-sm text-muted-foreground">Total Days</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-500">{presentDays}</div>
            <p className="text-sm text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{lateDays}</div>
            <p className="text-sm text-muted-foreground">Late Arrivals</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatWorkHours(totalHours)}</div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {showAllEmployees && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">This Month</SelectItem>
                <SelectItem value="previous">Last Month</SelectItem>
                <SelectItem value="last3">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>

            {showAllEmployees && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[150px]">
                  <Building className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="w-full overflow-x-auto rounded-md border">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Date</TableHead>
                    {showAllEmployees && <TableHead className="min-w-[140px]">Employee</TableHead>}
                    <TableHead className="min-w-[90px]">Check In</TableHead>
                    <TableHead className="min-w-[90px]">Check Out</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[90px]">Work Hours</TableHead>
                    <TableHead className="min-w-[80px]">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={showAllEmployees ? 7 : 6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showAllEmployees ? 7 : 6} className="text-center py-8">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium min-w-[100px]">
                          <div>
                            {format(new Date(record.date), 'EEE, MMM d')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(record.date), 'yyyy')}
                          </div>
                        </TableCell>
                        {showAllEmployees && (
                          <TableCell className="min-w-[140px]">
                            <div className="font-medium">{record.employee?.full_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {record.employee?.employee_code}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="min-w-[90px]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            {record.check_in
                              ? format(new Date(record.check_in), 'hh:mm a')
                              : '--:--'}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[90px]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-red-500" />
                            {record.check_out
                              ? format(new Date(record.check_out), 'hh:mm a')
                              : '--:--'}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[80px]">{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="min-w-[90px]">{formatWorkHours(record.work_hours)}</TableCell>
                        <TableCell className="min-w-[80px]">
                          {record.is_within_geofence !== null && (
                            <Badge
                              variant={record.is_within_geofence ? 'default' : 'destructive'}
                              className={record.is_within_geofence ? 'bg-emerald-600' : ''}
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              {record.is_within_geofence ? 'Valid' : 'Outside'}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
