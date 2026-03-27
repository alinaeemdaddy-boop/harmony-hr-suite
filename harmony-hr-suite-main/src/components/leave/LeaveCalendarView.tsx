import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Users, 
  AlertTriangle,
  Sun,
  Moon,
  Coffee,
  Building2,
  Filter
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  addMonths, 
  subMonths,
  isWeekend,
  isSameDay,
  parseISO
} from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_avatar?: string;
  department_name?: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  status: string;
  half_day: boolean;
  half_day_type?: string;
  total_days: number;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

interface Department {
  id: string;
  name: string;
}

interface LeaveCalendarViewProps {
  employeeId?: string;
  showTeamView?: boolean;
}

export function LeaveCalendarView({ employeeId, showTeamView = true }: LeaveCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('approved');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchData();
  }, [currentDate, selectedDepartment, selectedStatus]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchLeaveRequests(), fetchHolidays(), fetchDepartments()]);
    setLoading(false);
  };

  const fetchLeaveRequests = async () => {
    const start = format(monthStart, 'yyyy-MM-dd');
    const end = format(monthEnd, 'yyyy-MM-dd');

    let query = supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        start_date,
        end_date,
        status,
        half_day,
        half_day_type,
        total_days,
        leave_types(name),
        employees(full_name, avatar_url, departments(name))
      `)
      .or(`start_date.lte.${end},end_date.gte.${start}`);

    if (selectedStatus !== 'all') {
      query = query.eq('status', selectedStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leave requests:', error);
      return;
    }

    const formattedData: LeaveRequest[] = (data || []).map((req: any) => ({
      id: req.id,
      employee_id: req.employee_id,
      employee_name: req.employees?.full_name || 'Unknown',
      employee_avatar: req.employees?.avatar_url,
      department_name: req.employees?.departments?.name,
      leave_type_name: req.leave_types?.name || 'Leave',
      start_date: req.start_date,
      end_date: req.end_date,
      status: req.status,
      half_day: req.half_day || false,
      half_day_type: req.half_day_type,
      total_days: req.total_days || 1,
    }));

    // Filter by department if selected
    const filtered = selectedDepartment === 'all' 
      ? formattedData 
      : formattedData.filter(r => r.department_name === departments.find(d => d.id === selectedDepartment)?.name);

    setLeaveRequests(filtered);
  };

  const fetchHolidays = async () => {
    const year = currentDate.getFullYear();
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('year', year)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching holidays:', error);
      return;
    }

    setHolidays(data || []);
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      return;
    }

    setDepartments(data || []);
  };

  const getLeaveForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return leaveRequests.filter(req => {
      const start = parseISO(req.start_date);
      const end = parseISO(req.end_date);
      const checkDate = parseISO(dateStr);
      return checkDate >= start && checkDate <= end;
    });
  };

  const getHolidayForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.find(h => h.date === dateStr);
  };

  const hasConflict = useMemo(() => {
    const dateConflicts: Record<string, number> = {};
    leaveRequests.forEach(req => {
      const start = parseISO(req.start_date);
      const end = parseISO(req.end_date);
      const days = eachDayOfInterval({ start, end });
      days.forEach(day => {
        const key = format(day, 'yyyy-MM-dd');
        dateConflicts[key] = (dateConflicts[key] || 0) + 1;
      });
    });
    return dateConflicts;
  }, [leaveRequests]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/20 text-success border-success/30';
      case 'pending': return 'bg-warning/20 text-warning border-warning/30';
      case 'rejected': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const selectedDateLeaves = selectedDate ? getLeaveForDate(selectedDate) : [];
  const selectedDateHoliday = selectedDate ? getHolidayForDate(selectedDate) : null;

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Leave Calendar</CardTitle>
                <CardDescription>Team availability and leave schedules</CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="min-w-[140px]"
                onClick={() => setCurrentDate(new Date())}
              >
                {format(currentDate, 'MMMM yyyy')}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calendar Grid */}
          <div className="border rounded-lg overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-muted/50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-b">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {/* Add empty cells for days before month starts */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] p-2 bg-muted/20 border-b border-r" />
              ))}

              {daysInMonth.map((day, idx) => {
                const dayLeaves = getLeaveForDate(day);
                const holiday = getHolidayForDate(day);
                const isWeekendDay = isWeekend(day);
                const conflictCount = hasConflict[format(day, 'yyyy-MM-dd')] || 0;
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'min-h-[100px] p-2 border-b border-r cursor-pointer transition-all hover:bg-primary/5',
                      isWeekendDay && 'bg-muted/30',
                      holiday && 'bg-accent/10',
                      isToday(day) && 'ring-2 ring-primary ring-inset',
                      isSelected && 'bg-primary/10',
                      conflictCount >= 3 && 'bg-warning/10'
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className={cn(
                        'text-sm font-medium',
                        isToday(day) && 'text-primary font-bold',
                        isWeekendDay && 'text-muted-foreground'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {conflictCount >= 3 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="w-4 h-4 text-warning" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {conflictCount} employees on leave
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {/* Holiday Badge */}
                    {holiday && (
                      <div className="mb-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-accent/20 text-accent-foreground border-accent/30 truncate max-w-full">
                          {holiday.name}
                        </Badge>
                      </div>
                    )}

                    {/* Leave Avatars */}
                    <div className="flex flex-wrap gap-1">
                      <TooltipProvider>
                        {dayLeaves.slice(0, 3).map(leave => (
                          <Tooltip key={leave.id}>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                'relative',
                                leave.half_day && 'opacity-70'
                              )}>
                                <Avatar className="w-6 h-6 border-2 border-background">
                                  <AvatarImage src={leave.employee_avatar} />
                                  <AvatarFallback className="text-[8px] bg-primary/20">
                                    {getInitials(leave.employee_name)}
                                  </AvatarFallback>
                                </Avatar>
                                {leave.half_day && (
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-warning rounded-full flex items-center justify-center">
                                    {leave.half_day_type === 'first_half' ? (
                                      <Sun className="w-2 h-2 text-warning-foreground" />
                                    ) : (
                                      <Moon className="w-2 h-2 text-warning-foreground" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[200px]">
                              <p className="font-medium">{leave.employee_name}</p>
                              <p className="text-xs text-muted-foreground">{leave.leave_type_name}</p>
                              {leave.half_day && (
                                <p className="text-xs text-warning">
                                  {leave.half_day_type === 'first_half' ? 'Morning' : 'Afternoon'} off
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                        {dayLeaves.length > 3 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                                +{dayLeaves.length - 3}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {dayLeaves.length - 3} more on leave
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20 ring-2 ring-primary" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted/30" />
              <span>Weekend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-accent/10" />
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-warning" />
              <span>High Leave Count</span>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="w-3 h-3 text-warning" />
              <span>Half Day (AM)</span>
            </div>
            <div className="flex items-center gap-2">
              <Moon className="w-3 h-3 text-warning" />
              <span>Half Day (PM)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card className="border shadow-sm animate-fade-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              {selectedDateHoliday && (
                <Badge variant="outline" className="ml-2 bg-accent/20">
                  {selectedDateHoliday.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateLeaves.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No leaves scheduled for this date</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3">
                  {selectedDateLeaves.map(leave => (
                    <div 
                      key={leave.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={leave.employee_avatar} />
                          <AvatarFallback className="bg-primary/20">
                            {getInitials(leave.employee_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{leave.employee_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{leave.leave_type_name}</span>
                            {leave.department_name && (
                              <>
                                <span>•</span>
                                <span>{leave.department_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {leave.half_day && (
                          <Badge variant="outline" className="text-xs">
                            {leave.half_day_type === 'first_half' ? (
                              <><Sun className="w-3 h-3 mr-1" /> AM</>
                            ) : (
                              <><Moon className="w-3 h-3 mr-1" /> PM</>
                            )}
                          </Badge>
                        )}
                        <Badge className={cn('text-xs', getStatusColor(leave.status))}>
                          {leave.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}