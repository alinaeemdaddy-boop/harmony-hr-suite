import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, ChevronLeft, ChevronRight, Star, MapPin } from 'lucide-react';
import { format, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description: string | null;
  is_recurring: boolean;
}

interface HolidayCalendarProps {
  compact?: boolean;
}

export function HolidayCalendar({ compact = false }: HolidayCalendarProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    const currentYear = new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('year', currentYear)
      .eq('is_active', true)
      .order('date');

    if (error) {
      console.error('Error fetching holidays:', error);
    } else {
      setHolidays(data || []);
    }
    setLoading(false);
  };

  const getHolidaysForMonth = () => {
    return holidays.filter(h => 
      isSameMonth(new Date(h.date), currentMonth)
    );
  };

  const getUpcomingHolidays = () => {
    const today = new Date();
    return holidays
      .filter(h => new Date(h.date) >= today)
      .slice(0, 5);
  };

  const holidayDates = holidays.map(h => new Date(h.date));
  const monthHolidays = getHolidaysForMonth();
  const upcomingHolidays = getUpcomingHolidays();

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  // Calculate working days in current month
  const calculateWorkingDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    
    const workingDays = allDays.filter(day => {
      if (isWeekend(day)) return false;
      const isHoliday = holidayDates.some(
        hd => format(hd, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      return !isHoliday;
    });

    return workingDays.length;
  };

  if (compact) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="w-4 h-4 text-primary" />
            Upcoming Holidays
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-8 bg-muted rounded" />
              ))}
            </div>
          ) : upcomingHolidays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming holidays
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingHolidays.map((holiday) => (
                <div 
                  key={holiday.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-warning" />
                    <span className="text-sm font-medium">{holiday.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(holiday.date), 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Holiday Calendar
            </CardTitle>
            <CardDescription>
              Public holidays and company observances
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar View */}
          <div>
            <Calendar
              mode="single"
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
              modifiers={{
                holiday: holidayDates,
              }}
              modifiersStyles={{
                holiday: { 
                  backgroundColor: 'hsl(var(--warning) / 0.2)',
                  color: 'hsl(var(--warning))',
                  fontWeight: 'bold',
                },
              }}
            />
            
            {/* Month Stats */}
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Working days this month</span>
                <span className="font-semibold">{calculateWorkingDays()} days</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Holidays this month</span>
                <span className="font-semibold text-warning">{monthHolidays.length}</span>
              </div>
            </div>
          </div>

          {/* Holiday List */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Holidays in {format(currentMonth, 'MMMM')}
            </h4>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-muted rounded" />
                ))}
              </div>
            ) : monthHolidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No holidays this month</p>
              </div>
            ) : (
              <div className="space-y-3">
                {monthHolidays.map((holiday) => (
                  <div 
                    key={holiday.id}
                    className="p-4 rounded-lg bg-warning/10 border border-warning/20 hover:bg-warning/20 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium flex items-center gap-2">
                          <Star className="w-4 h-4 text-warning" />
                          {holiday.name}
                        </h5>
                        {holiday.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
                        {format(new Date(holiday.date), 'EEE, MMM d')}
                      </Badge>
                    </div>
                    {holiday.is_recurring && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Recurring Annually
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Holidays Preview */}
            {upcomingHolidays.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                  Next Upcoming Holidays
                </h4>
                <div className="space-y-2">
                  {upcomingHolidays.slice(0, 3).map((holiday) => (
                    <div 
                      key={holiday.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                    >
                      <span className="text-sm">{holiday.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(holiday.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
