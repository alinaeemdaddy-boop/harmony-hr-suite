import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Plus, X, Wand2, Stethoscope, Search, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RosterCalendarProps {
    isAdmin: boolean;
}

interface Employee {
    id: string;
    full_name: string;
    avatar_url: string | null;
    designation: string | null;
}

interface Shift {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    color: string;
}

interface RosterEntry {
    id: string;
    employee_id: string;
    shift_id: string;
    date: string; // YYYY-MM-DD
    shift?: Shift;
}

interface LeaveRequest {
    employee_id: string;
    start_date: string;
    end_date: string;
    status: string;
    leave_type?: { name: string };
}

export function RosterCalendar({ isAdmin }: RosterCalendarProps) {
    const { toast } = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDesignation, setFilterDesignation] = useState<string>('all');

    // Week calculation
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Employees
            const { data: empData } = await supabase
                .from('employees')
                .select('id, full_name, avatar_url, designation')
                .eq('status', 'active')
                .order('full_name');
            setEmployees(empData || []);

            // 2. Fetch Shifts
            const { data: shiftData, error: shiftError } = await supabase
                .from('shifts')
                .select('*')
                .order('name');
            if (shiftError) {
              console.warn('No shifts table - create via roster_schema.sql:', shiftError.message);
              setShifts([]);
            } else {
              setShifts(shiftData || []);
            }

            // 3. Fetch Roster for this week
            const { data: rosterData, error: rosterError } = await supabase
                .from('roster_entries')
                .select(`
                  id,
                  employee_id,
                  shift_id,
                  date,
                  shift:shifts(*)
                `)
                .gte('date', format(startDate, 'yyyy-MM-dd'))
                .lte('date', format(weekDays[6], 'yyyy-MM-dd'))
                .order('employee_id');
            if (rosterError) {
              console.warn('No roster_entries - seed via seed_roster.sql:', rosterError.message);
              setRosterEntries([]);
            } else {
              setRosterEntries(rosterData || []);
            }

            // 4. Fetch Approved Leaves for this week
            const { data: leaveData } = await supabase
                .from('leave_requests')
                .select('employee_id, start_date, end_date, status, leave_type:leave_types(name)')
                .eq('status', 'approved')
                .or(`start_date.lte.${format(weekDays[6], 'yyyy-MM-dd')},end_date.gte.${format(startDate, 'yyyy-MM-dd')}`);

            setLeaves(leaveData as any || []);

        } catch (error) {
            console.warn('Roster fetch partial failure:', error);
            toast({ title: 'Info', description: 'Run roster_schema.sql + seed_roster.sql in Supabase', variant: 'default' });
        } finally {
            setLoading(false);
        }
    };

    const assignShift = async (employeeId: string, shiftId: string, date: Date) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        try {
            const existing = rosterEntries.find(r => r.employee_id === employeeId && r.date === formattedDate);
            if (existing) {
                const { error } = await (supabase as any).from('roster_entries').update({ shift_id: shiftId }).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any).from('roster_entries').insert({ employee_id: employeeId, shift_id: shiftId, date: formattedDate });
                if (error) throw error;
            }
            toast({ title: 'Shift Assigned', description: 'Roster updated successfully.' });
            fetchData();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to assign shift', variant: 'destructive' });
        }
    };

    const removeShift = async (entryId: string) => {
        try {
            const { error } = await (supabase as any).from('roster_entries').delete().eq('id', entryId);
            if (error) throw error;
            toast({ title: 'Shift Removed', description: 'Shift removed from roster.' });
            fetchData();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to remove shift', variant: 'destructive' });
        }
    };

    const autoSchedule = async () => {
        if (!shifts.length) return;
        // Simple logic: pick first shift for M-F
        const defaultShift = shifts[0];

        let newEntries = [];

        for (const emp of employees) {
            for (const day of weekDays) {
                // Check if leave
                const onLeave = isEmployeeOnLeave(emp.id, day);
                if (onLeave) continue;

                // Check if already assigned
                const entry = getEntry(emp.id, day);
                if (entry) continue;

                // Simple skip weekends logic for "standard" work week
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                if (!isWeekend) {
                    newEntries.push({
                        employee_id: emp.id,
                        shift_id: defaultShift.id,
                        date: format(day, 'yyyy-MM-dd'),
                        status: 'published'
                    });
                }
            }
        }

        if (newEntries.length === 0) {
            toast({ title: 'No Slots to Fill', description: 'Schedule is already full or no employees need shifts.' });
            return;
        }

        try {
            const { error } = await (supabase as any).from('roster_entries').insert(newEntries);
            if (error) throw error;
            toast({ title: 'Auto-Schedule Complete', description: `Assigned ${newEntries.length} new shifts.` });
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to auto-schedule', variant: 'destructive' });
        }
    };

    const getEntry = (empId: string, date: Date) => {
        const d = format(date, 'yyyy-MM-dd');
        return rosterEntries.find(r => r.employee_id === empId && r.date === d);
    };

    const isEmployeeOnLeave = (empId: string, date: Date) => {
        const d = date.getTime();
        return leaves.find(l => {
            if (l.employee_id !== empId) return false;
            const start = new Date(l.start_date).getTime();
            const end = new Date(l.end_date).getTime();
            return d >= start && d <= end;
        });
    };

    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.full_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDesignation = filterDesignation === 'all'
            ? true
            : filterDesignation === 'doctor'
                ? emp.designation?.toLowerCase().includes('doctor')
                : true;
        return matchesSearch && matchesDesignation;
    });

    if (loading && employees.length === 0) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <Card className="glass-card">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle>Weekly Roster</CardTitle>
                        <CardDescription>
                            {format(startDate, 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <Button variant="secondary" size="sm" onClick={autoSchedule} className="hidden sm:flex" disabled={shifts.length === 0}>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Auto Schedule
                            </Button>
                        )}
                        <Button variant="outline" size="icon" onClick={prevWeek}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={nextWeek}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                            Today
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            className="pl-9 bg-background/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={filterDesignation} onValueChange={setFilterDesignation}>
                        <SelectTrigger className="w-full sm:w-[200px] bg-background/50">
                            <SelectValue placeholder="All Staff" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Staff</SelectItem>
                            <SelectItem value="doctor">
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-rose-500" />
                                    <span>Doctors Only</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table className="min-w-[800px]">
                    {/* Table Headers */}
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px] sticky left-0 bg-card z-10 shadow-sm border-r">
                                <div className="flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-primary" />
                                    <span>Employee</span>
                                </div>
                            </TableHead>
                            {weekDays.map(day => (
                                <TableHead key={day.toISOString()} className="text-center min-w-[100px]">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-normal text-muted-foreground">{format(day, 'EEE')}</span>
                                        <span className={`font-bold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEmployees.map(employee => {
                            const isDoctor = employee.designation?.toLowerCase().includes('doctor');
                            return (
                                <TableRow key={employee.id} className={isDoctor ? "bg-rose-50/20 hover:bg-rose-50/30" : ""}>
                                    <TableCell className={cn(
                                        "font-medium sticky left-0 z-10 border-r border-border/50",
                                        isDoctor ? "bg-rose-50/50" : "bg-card"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                                    <AvatarImage src={employee.avatar_url || ''} />
                                                    <AvatarFallback>{employee.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                {isDoctor && (
                                                    <div className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-sm">
                                                        <Stethoscope className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-1.5">
                                                    {employee.full_name}
                                                    {isDoctor && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-rose-100 text-rose-700 border-rose-200">Doc</Badge>}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{employee.designation}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    {weekDays.map(day => {
                                        const entry = getEntry(employee.id, day);
                                        const leave = isEmployeeOnLeave(employee.id, day);

                                        if (leave) {
                                            return (
                                                <TableCell key={day.toISOString()} className="p-1 border-l border-border/50 bg-muted/20">
                                                    <div className="h-16 rounded-md bg-amber-100/50 border border-amber-200 flex flex-col items-center justify-center text-amber-700">
                                                        <span className="text-xs font-bold">On Leave</span>
                                                        <span className="text-[10px] opacity-80">{leave.leave_type?.name || 'Leave'}</span>
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        return (
                                            <TableCell key={day.toISOString()} className="p-1 border-l border-border/50">
                                                {isAdmin ? (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <div className={`
                                                          h-16 rounded-md border border-dashed border-border/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-muted/50
                                                          ${entry ? `${entry.shift?.color || 'bg-primary'} border-none text-white shadow-sm ring-1 ring-inset ring-black/5` : ''}
                                                        `}>
                                                                {entry ? (
                                                                    <>
                                                                        <span className="text-xs font-semibold px-1 text-center leading-tight truncate w-full">{entry.shift?.name}</span>
                                                                        <span className="text-[10px] opacity-90 mt-1">
                                                                            {entry.shift?.start_time.slice(0, 5)} - {entry.shift?.end_time.slice(0, 5)}
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <Plus className="w-4 h-4 opacity-20" />
                                                                )}
                                                            </div>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-56 p-2">
                                                            <p className="text-xs font-medium text-muted-foreground mb-2">Assign for {format(day, 'EEE, MMM d')}</p>
                                                            <div className="space-y-1">
                                                                {shifts.map(shift => (
                                                                    <button
                                                                        key={shift.id}
                                                                        onClick={() => assignShift(employee.id, shift.id, day)}
                                                                        className="w-full text-left flex items-center gap-2 p-2 text-sm rounded-md hover:bg-muted transition-colors"
                                                                    >
                                                                        <div className={`w-3 h-3 rounded-full ${shift.color}`} />
                                                                        <span>{shift.name}</span>
                                                                        <span className="ml-auto text-xs text-muted-foreground">
                                                                            {shift.start_time.slice(0, 5)}
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                                {entry && (
                                                                    <>
                                                                        <div className="h-px bg-border my-1" />
                                                                        <button
                                                                            onClick={() => removeShift(entry.id)}
                                                                            className="w-full text-left flex items-center gap-2 p-2 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                            Clear Shift
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                ) : (
                                                    <div className={`
                                                    h-16 rounded-md flex flex-col items-center justify-center
                                                    ${entry ? `${entry.shift?.color || 'bg-primary'} text-primary-foreground shadow-sm` : 'bg-muted/10'}
                                                `}>
                                                        {entry && (
                                                            <>
                                                                <span className="text-xs font-semibold px-1 text-center leading-tight">{entry.shift?.name}</span>
                                                                <span className="text-[10px] opacity-90 mt-1">
                                                                    {entry.shift?.start_time.slice(0, 5)} - {entry.shift?.end_time.slice(0, 5)}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
