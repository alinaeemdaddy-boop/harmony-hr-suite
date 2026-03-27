import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  Palmtree,
  Heart,
  Briefcase,
  Baby,
  Plane,
  GraduationCap,
  CalendarDays
} from 'lucide-react';
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

interface LeaveBalanceCardProps {
  balances: LeaveBalance[];
  loading?: boolean;
}

const leaveTypeIcons: Record<string, React.ElementType> = {
  'Annual Leave': Palmtree,
  'Sick Leave': Heart,
  'Casual Leave': Briefcase,
  'Maternity Leave': Baby,
  'Paternity Leave': Baby,
  'Hajj Leave': Plane,
  'Study Leave': GraduationCap,
  'Earned Leave': CalendarDays,
};

const leaveTypeColors: Record<string, string> = {
  'Annual Leave': 'from-primary/20 to-primary/5 border-primary/30',
  'Sick Leave': 'from-destructive/20 to-destructive/5 border-destructive/30',
  'Casual Leave': 'from-accent/20 to-accent/5 border-accent/30',
  'Maternity Leave': 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
  'Paternity Leave': 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
  'Hajj Leave': 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
  'Study Leave': 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
  'Earned Leave': 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
};

export function LeaveBalanceCard({ balances, loading }: LeaveBalanceCardProps) {
  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            Leave Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse p-4 rounded-xl border bg-muted/20">
                <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                <div className="h-2 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getColorByUsage = (available: number, total: number) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;
    if (percentage <= 20) return 'text-destructive';
    if (percentage <= 50) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = (available: number, total: number) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;
    if (percentage <= 20) return 'bg-destructive';
    if (percentage <= 50) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span>Leave Balances</span>
            <p className="text-sm font-normal text-muted-foreground mt-0.5">
              Your remaining leave entitlements
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {balances.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No Leave Balances Found</h3>
            <p className="text-sm text-muted-foreground">
              Contact HR to set up your leave entitlements
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {balances.map((balance) => {
              const available = balance.total_days - balance.used_days - balance.pending_days;
              const usedPercentage = balance.total_days > 0 
                ? ((balance.used_days + balance.pending_days) / balance.total_days) * 100 
                : 0;
              const Icon = leaveTypeIcons[balance.leave_type_name] || CalendarDays;
              const colorClass = leaveTypeColors[balance.leave_type_name] || 'from-muted/20 to-muted/5 border-border';
              
              return (
                <div 
                  key={balance.id} 
                  className={cn(
                    'relative p-4 rounded-xl border bg-gradient-to-br transition-all hover:shadow-md',
                    colorClass
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-foreground/70" />
                      <div>
                        <h4 className="font-medium text-sm">{balance.leave_type_name}</h4>
                        {!balance.is_paid && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1 bg-warning/20 text-warning border-warning/30">
                            Unpaid
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn('text-2xl font-bold', getColorByUsage(available, balance.total_days))}>
                        {available}
                      </span>
                      <span className="text-sm text-muted-foreground">/{balance.total_days}</span>
                    </div>
                  </div>
                  
                  <div className="relative h-2 rounded-full bg-background/50 overflow-hidden">
                    <div 
                      className={cn('absolute top-0 left-0 h-full rounded-full transition-all', getProgressColor(available, balance.total_days))}
                      style={{ width: `${100 - Math.min(usedPercentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Used: {balance.used_days}
                      </span>
                      {balance.pending_days > 0 && (
                        <span className="flex items-center gap-1 text-warning">
                          <Clock className="w-3 h-3" />
                          Pending: {balance.pending_days}
                        </span>
                      )}
                    </div>
                    {balance.carried_over_days > 0 && (
                      <span className="text-accent font-medium">
                        +{balance.carried_over_days} carried
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}