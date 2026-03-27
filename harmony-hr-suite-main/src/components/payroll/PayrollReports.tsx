import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  Building2,
  Download,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  Calculator,
  Shield,
  Briefcase,
  PieChart as PieChartIcon,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportPayslipsToPDF, exportPayslipsToExcel, exportPayslipsToWord, ExportablePayslip } from '@/lib/exportUtils';

interface DepartmentPayroll {
  department: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  avgSalary: number;
}

interface TaxSummary {
  month: string;
  totalTax: number;
  totalEOBI: number;
  totalPF: number;
  totalSocialSecurity: number;
  totalHealthInsurance: number;
}

interface PayrollTrend {
  month: string;
  gross: number;
  deductions: number;
  net: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export function PayrollReports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('department');
  const [rawPayslips, setRawPayslips] = useState<any[]>([]);

  const [branchData, setBranchData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentPayroll[]>([]);
  const [taxSummary, setTaxSummary] = useState<TaxSummary[]>([]);
  const [payrollTrends, setPayrollTrends] = useState<PayrollTrend[]>([]);
  const [deductionBreakdown, setDeductionBreakdown] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData();
  }, [selectedYear, selectedMonth]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPayrollBreakdown(),
      fetchTaxSummary(),
      fetchPayrollTrends(),
      fetchDeductionBreakdown(),
    ]);
    setLoading(false);
  };

  const fetchPayrollBreakdown = async () => {
    const { data: payslips } = await supabase
      .from('payslips')
      .select(`
        gross_earnings,
        total_deductions,
        net_salary,
        employee:employees(
          department:departments(name),
          branch:branches(name)
        ),
        period:payroll_periods(year, month)
      `)
      .eq('period.year', selectedYear);

    if (!payslips) return;

    const deptMap = new Map<string, DepartmentPayroll>();
    const branchMap = new Map<string, any>();

    payslips.forEach((p: any) => {
      if (selectedMonth !== 'all' && p.period?.month !== parseInt(selectedMonth)) return;

      // Department Aggregation
      const deptName = p.employee?.department?.name || 'Unassigned';
      const existingDept = deptMap.get(deptName) || {
        department: deptName,
        employeeCount: 0,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        avgSalary: 0,
      };

      existingDept.employeeCount += 1;
      existingDept.totalGross += p.gross_earnings || 0;
      existingDept.totalDeductions += p.total_deductions || 0;
      existingDept.totalNet += p.net_salary || 0;
      existingDept.avgSalary = existingDept.totalNet / existingDept.employeeCount;

      deptMap.set(deptName, existingDept);

      // Branch Aggregation
      const branchName = p.employee?.branch?.name || 'Unassigned';
      const existingBranch = branchMap.get(branchName) || {
        branch: branchName,
        employeeCount: 0,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        avgSalary: 0,
      };

      existingBranch.employeeCount += 1;
      existingBranch.totalGross += p.gross_earnings || 0;
      existingBranch.totalDeductions += p.total_deductions || 0;
      existingBranch.totalNet += p.net_salary || 0;
      existingBranch.avgSalary = existingBranch.totalNet / existingBranch.employeeCount;

      branchMap.set(branchName, existingBranch);
    });

    setDepartmentData(Array.from(deptMap.values()));
    setBranchData(Array.from(branchMap.values()));

    // Store filtered payslips for export
    const filteredPayslips = payslips.filter((p: any) => selectedMonth === 'all' || p.period?.month === parseInt(selectedMonth));
    setRawPayslips(filteredPayslips);
  };

  const fetchTaxSummary = async () => {
    const { data: payslips } = await supabase
      .from('payslips')
      .select(`
        tax_amount,
        eobi_amount,
        provident_fund,
        health_insurance_deduction,
        social_security_deduction,
        period:payroll_periods(year, month, name)
      `)
      .eq('period.year', selectedYear)
      .order('period(month)', { ascending: true });

    if (!payslips) return;

    const monthMap = new Map<string, TaxSummary>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    payslips.forEach((p: any) => {
      const monthKey = monthNames[p.period?.month - 1] || 'Unknown';
      const existing = monthMap.get(monthKey) || {
        month: monthKey,
        totalTax: 0,
        totalEOBI: 0,
        totalPF: 0,
        totalSocialSecurity: 0,
        totalHealthInsurance: 0,
      };

      existing.totalTax += p.tax_amount || 0;
      existing.totalEOBI += p.eobi_amount || 0;
      existing.totalPF += p.provident_fund || 0;
      existing.totalSocialSecurity += p.social_security_deduction || 0;
      existing.totalHealthInsurance += p.health_insurance_deduction || 0;

      monthMap.set(monthKey, existing);
    });

    setTaxSummary(Array.from(monthMap.values()));
  };

  const fetchPayrollTrends = async () => {
    const { data: runs } = await supabase
      .from('payroll_runs')
      .select(`
        total_gross,
        total_deductions,
        total_net,
        period:payroll_periods(year, month, name)
      `)
      .eq('status', 'completed')
      .order('period(year)', { ascending: true })
      .order('period(month)', { ascending: true })
      .limit(12);

    if (!runs) return;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const trends = runs.map((r: any) => ({
      month: `${monthNames[r.period?.month - 1]} ${r.period?.year}`,
      gross: r.total_gross || 0,
      deductions: r.total_deductions || 0,
      net: r.total_net || 0,
    }));

    setPayrollTrends(trends);
  };

  const fetchDeductionBreakdown = async () => {
    const { data: payslips } = await supabase
      .from('payslips')
      .select(`
        tax_amount,
        provident_fund,
        eobi_amount,
        health_insurance_deduction,
        social_security_deduction,
        advance_deduction,
        loan_deduction,
        other_deductions,
        period:payroll_periods(year, month)
      `)
      .eq('period.year', selectedYear);

    if (!payslips) return;

    let totals = {
      tax: 0,
      pf: 0,
      eobi: 0,
      health: 0,
      social: 0,
      advance: 0,
      loan: 0,
      other: 0,
    };

    payslips.forEach((p: any) => {
      if (selectedMonth !== 'all' && p.period?.month !== parseInt(selectedMonth)) return;
      totals.tax += p.tax_amount || 0;
      totals.pf += p.provident_fund || 0;
      totals.eobi += p.eobi_amount || 0;
      totals.health += p.health_insurance_deduction || 0;
      totals.social += p.social_security_deduction || 0;
      totals.advance += p.advance_deduction || 0;
      totals.loan += p.loan_deduction || 0;
      totals.other += p.other_deductions || 0;
    });

    setDeductionBreakdown([
      { name: 'Income Tax', value: totals.tax, color: COLORS[0] },
      { name: 'Provident Fund', value: totals.pf, color: COLORS[1] },
      { name: 'EOBI', value: totals.eobi, color: COLORS[2] },
      { name: 'Health Insurance', value: totals.health, color: COLORS[3] },
      { name: 'Social Security', value: totals.social, color: COLORS[4] },
      { name: 'Advances', value: totals.advance, color: 'hsl(var(--muted-foreground))' },
      { name: 'Loans', value: totals.loan, color: 'hsl(var(--border))' },
      { name: 'Other', value: totals.other, color: 'hsl(var(--secondary))' },
    ].filter(d => d.value > 0));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportReport = async (type: string) => {
    if (rawPayslips.length === 0) {
      toast({
        title: 'No Data',
        description: 'No payslips available to export for this period',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Export Started',
      description: `Generating ${type} report...`,
    });

    const exportData: ExportablePayslip[] = rawPayslips.map(p => ({
      id: p.id,
      employee_name: p.employee?.full_name || 'N/A',
      employee_code: p.employee?.employee_code || 'N/A',
      designation: 'N/A', // Not fetched in current query, strictly speaking
      department: p.employee?.department?.name || 'N/A',
      period_name: `${p.period?.month}/${p.period?.year}`,
      basic_salary: p.basic_salary || 0,
      allowances: p.total_allowances || 0,
      gross_earnings: p.gross_earnings || 0,
      tax_amount: p.tax_amount || 0,
      provident_fund: p.provident_fund || 0,
      eobi_amount: p.eobi_amount || 0,
      loan_deduction: p.loan_deduction || 0,
      advance_deduction: p.advance_deduction || 0,
      other_deductions: p.other_deductions || 0,
      total_deductions: p.total_deductions || 0,
      net_salary: p.net_salary || 0,
      payment_date: p.created_at, // Using created_at as proxy for now
      working_days: p.working_days || 30,
      days_worked: p.days_worked || 30,
      leaves_taken: p.leaves_taken || 0,
      overtime_amount: p.overtime_amount || 0,
    }));

    const filename = `Payslip_Report_${selectedYear}_${selectedMonth === 'all' ? 'Annual' : selectedMonth}`;

    try {
      if (type === 'PDF') {
        exportPayslipsToPDF(exportData, filename);
      } else if (type === 'Excel') {
        await exportPayslipsToExcel(exportData, filename);
      } else if (type === 'Word') {
        await exportPayslipsToWord(exportData, filename);
      }

      toast({
        title: 'Export Success',
        description: `${type} report has been downloaded.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Export Failed',
        description: 'Could not generate report.',
        variant: 'destructive',
      });
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const totalGross = departmentData.reduce((sum, d) => sum + d.totalGross, 0);
  const totalDeductions = departmentData.reduce((sum, d) => sum + d.totalDeductions, 0);
  const totalNet = departmentData.reduce((sum, d) => sum + d.totalNet, 0);
  const totalEmployees = departmentData.reduce((sum, d) => sum + d.employeeCount, 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Year:</span>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Month:</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchAllData} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => exportReport('PDF')}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => exportReport('Excel')}>
                Export Excel
              </Button>
              <Button variant="outline" onClick={() => exportReport('Word')}>
                <FileText className="w-4 h-4 mr-2" />
                Export Word
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-xl font-bold">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gross Payroll</p>
                <p className="text-xl font-bold">{formatCurrency(totalGross)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Calculator className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="text-xl font-bold">{formatCurrency(totalDeductions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <DollarSign className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Payroll</p>
                <p className="text-xl font-bold">{formatCurrency(totalNet)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto lg:inline-grid gap-1 bg-muted/50 p-1">
          <TabsTrigger value="department" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Department</span>
          </TabsTrigger>
          <TabsTrigger value="branch" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Branch</span>
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Tax & Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="deductions" className="gap-2">
            <PieChartIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Deductions</span>
          </TabsTrigger>
        </TabsList>

        {/* Department Report */}
        <TabsContent value="department">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Department-wise Payroll
                </CardTitle>
                <CardDescription>Payroll distribution by department</CardDescription>
              </CardHeader>
              <CardContent>
                {departmentData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payroll data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="department" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="totalGross" name="Gross" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalNet" name="Net" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Department Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Avg. Salary</TableHead>
                      <TableHead className="text-right">Total Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentData.map((dept) => (
                      <TableRow key={dept.department}>
                        <TableCell className="font-medium">{dept.department}</TableCell>
                        <TableCell className="text-right">{dept.employeeCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(dept.avgSalary)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(dept.totalNet)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Branch Report */}
        <TabsContent value="branch">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Branch-wise Payroll
                </CardTitle>
                <CardDescription>Payroll distribution by branch</CardDescription>
              </CardHeader>
              <CardContent>
                {branchData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payroll data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={branchData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="branch" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="totalGross" name="Gross" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalNet" name="Net" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Branch Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Avg. Salary</TableHead>
                      <TableHead className="text-right">Total Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchData.map((branch) => (
                      <TableRow key={branch.branch}>
                        <TableCell className="font-medium">{branch.branch}</TableCell>
                        <TableCell className="text-right">{branch.employeeCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(branch.avgSalary)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(branch.totalNet)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tax & Compliance Report */}
        <TabsContent value="tax">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Monthly Tax & Contributions
                </CardTitle>
                <CardDescription>FBR Tax, EOBI, PF breakdown by month</CardDescription>
              </CardHeader>
              <CardContent>
                {taxSummary.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tax data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={taxSummary}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="totalTax" name="Income Tax" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="totalPF" name="Provident Fund" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="totalEOBI" name="EOBI" stackId="1" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Tax Compliance Summary</CardTitle>
                <CardDescription>Statutory deductions for {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Income Tax</TableHead>
                      <TableHead className="text-right">EOBI</TableHead>
                      <TableHead className="text-right">PF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxSummary.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.totalTax)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.totalEOBI)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.totalPF)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right text-primary">
                        {formatCurrency(taxSummary.reduce((s, r) => s + r.totalTax, 0))}
                      </TableCell>
                      <TableCell className="text-right text-accent">
                        {formatCurrency(taxSummary.reduce((s, r) => s + r.totalEOBI, 0))}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(taxSummary.reduce((s, r) => s + r.totalPF, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payroll Trends */}
        <TabsContent value="trends">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Payroll Trends
              </CardTitle>
              <CardDescription>Historical payroll data over time</CardDescription>
            </CardHeader>
            <CardContent>
              {payrollTrends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trend data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={payrollTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="gross" name="Gross Payroll" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))' }} />
                    <Line type="monotone" dataKey="deductions" name="Deductions" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ fill: 'hsl(var(--warning))' }} />
                    <Line type="monotone" dataKey="net" name="Net Payroll" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deductions Breakdown */}
        <TabsContent value="deductions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Deductions Breakdown
                </CardTitle>
                <CardDescription>Distribution of all deduction types</CardDescription>
              </CardHeader>
              <CardContent>
                {deductionBreakdown.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <PieChartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No deduction data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deductionBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {deductionBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Deduction Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deductionBreakdown.map((item, index) => {
                    const total = deductionBreakdown.reduce((s, d) => s + d.value, 0);
                    const percentage = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }} />
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(item.value)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.color || COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between font-bold">
                      <span>Total Deductions</span>
                      <span className="text-primary">
                        {formatCurrency(deductionBreakdown.reduce((s, d) => s + d.value, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
