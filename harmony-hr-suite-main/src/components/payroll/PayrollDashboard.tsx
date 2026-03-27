import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
  PiggyBank,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Receipt,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PayrollStats {
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  pendingApprovals: number;
  lastPayrollDate: string | null;
}

export function PayrollDashboard() {
  const [stats, setStats] = useState<PayrollStats>({
    totalEmployees: 0,
    totalGrossSalary: 0,
    totalDeductions: 0,
    totalNetSalary: 0,
    pendingApprovals: 0,
    lastPayrollDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [recentPayslips, setRecentPayslips] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentPayslips();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    
    const { count: empCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: latestRun } = await supabase
      .from('payroll_runs')
      .select('*')
      .order('run_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: pendingCount } = await supabase
      .from('salary_advances')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    setStats({
      totalEmployees: empCount || 0,
      totalGrossSalary: latestRun?.total_gross || 0,
      totalDeductions: latestRun?.total_deductions || 0,
      totalNetSalary: latestRun?.total_net || 0,
      pendingApprovals: pendingCount || 0,
      lastPayrollDate: latestRun?.run_date || null,
    });
    
    setLoading(false);
  };

  const fetchRecentPayslips = async () => {
    const { data } = await supabase
      .from('payslips')
      .select(`
        *,
        employee:employees(full_name, employee_code, department:departments(name))
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentPayslips(data || []);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      format: (v: number) => v.toString(),
      trend: null,
    },
    {
      title: 'Gross Payroll',
      value: stats.totalGrossSalary,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      format: formatCurrency,
      trend: 'up',
    },
    {
      title: 'Total Deductions',
      value: stats.totalDeductions,
      icon: TrendingDown,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      format: formatCurrency,
      trend: 'down',
    },
    {
      title: 'Net Payroll',
      value: stats.totalNetSalary,
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      format: formatCurrency,
      trend: null,
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
      draft: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Draft', icon: FileText },
      generated: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Generated', icon: Receipt },
      approved: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Approved', icon: CheckCircle },
      paid: { color: 'bg-primary/10 text-primary border-primary/20', label: 'Paid', icon: DollarSign },
      cancelled: { color: 'bg-red-100 text-red-600 border-red-200', label: 'Cancelled', icon: AlertCircle },
    };
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={cn('font-medium gap-1 border', config.color)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Payroll Overview</h2>
          <p className="text-sm text-muted-foreground">
            {stats.lastPayrollDate 
              ? `Last processed: ${format(new Date(stats.lastPayrollDate), 'MMMM d, yyyy')}`
              : 'No payroll processed yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5 px-3 py-1.5">
            <Calendar className="w-4 h-4" />
            {format(new Date(), 'MMMM yyyy')}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card 
            key={stat.title} 
            className={cn(
              "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
              "bg-white border",
              stat.borderColor
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? (
                      <span className="animate-pulse bg-muted rounded h-8 w-24 block" />
                    ) : (
                      stat.format(stat.value)
                    )}
                  </p>
                </div>
                <div className={cn('p-2.5 rounded-xl', stat.bgColor)}>
                  <stat.icon className={cn('w-5 h-5', stat.color)} />
                </div>
              </div>
              {stat.trend && (
                <div className="mt-3 flex items-center gap-1.5">
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-amber-600" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    stat.trend === 'up' ? 'text-emerald-600' : 'text-amber-600'
                  )}>
                    From last period
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll Status - Wider */}
        <Card className="lg:col-span-2 bg-white border border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <PiggyBank className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Payroll Breakdown</CardTitle>
                <CardDescription>Summary of earnings and deductions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats.totalGrossSalary > 0 ? (
              <>
                {/* Earnings Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium text-muted-foreground">Gross Earnings</span>
                    </div>
                    <span className="font-semibold text-emerald-600">{formatCurrency(stats.totalGrossSalary)}</span>
                  </div>
                  <Progress 
                    value={100} 
                    className="h-2.5 bg-emerald-100"
                  />
                </div>

                {/* Deductions Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-sm font-medium text-muted-foreground">Total Deductions</span>
                    </div>
                    <span className="font-semibold text-amber-600">{formatCurrency(stats.totalDeductions)}</span>
                  </div>
                  <Progress 
                    value={(stats.totalDeductions / stats.totalGrossSalary) * 100} 
                    className="h-2.5 bg-amber-100"
                  />
                </div>

                {/* Net Total */}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="font-semibold text-foreground">Net Payroll</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(stats.totalNetSalary)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Deduction rate: {((stats.totalDeductions / stats.totalGrossSalary) * 100).toFixed(1)}%
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">No payroll data yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Run your first payroll to see breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-white border border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Period Status</CardTitle>
                <CardDescription>Current payroll cycle</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Last Run</span>
              </div>
              <span className="text-sm font-semibold">
                {stats.lastPayrollDate 
                  ? format(new Date(stats.lastPayrollDate), 'MMM d')
                  : 'Never'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active Employees</span>
              </div>
              <span className="text-sm font-semibold">{stats.totalEmployees}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700">Pending Advances</span>
              </div>
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                {stats.pendingApprovals}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Current Month</span>
              </div>
              <span className="text-sm font-semibold">{format(new Date(), 'MMM yyyy')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payslips */}
      <Card className="bg-white border border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Recent Payslips</CardTitle>
                <CardDescription>Latest generated salary statements</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentPayslips.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">No payslips generated yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Process payroll to generate payslips</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayslips.map((payslip) => (
                <div 
                  key={payslip.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {payslip.employee?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{payslip.employee?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {payslip.employee?.department?.name || 'No Department'} • {payslip.employee?.employee_code}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-bold text-primary">{formatCurrency(payslip.net_salary)}</p>
                      <p className="text-xs text-muted-foreground">Net Pay</p>
                    </div>
                    {getStatusBadge(payslip.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
