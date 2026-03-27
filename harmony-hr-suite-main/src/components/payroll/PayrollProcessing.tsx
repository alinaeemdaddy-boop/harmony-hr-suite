import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Users,
  Calendar,
  RefreshCw,
  Building,
  Trash2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, getDaysInMonth, isWeekend, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchActiveTaxSlabs, calculateAnnualTax, calculateEOBI, TaxSlab } from '@/lib/payrollUtils';

interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  year: number;
  month: number;
  working_days: number;
  status: string;
}

interface PayrollRun {
  id: string;
  period_id: string;
  run_date: string;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  notes: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
  salary: number | null;
  department: { name: string } | null;
  branch_id?: string;
  branch?: { name: string } | null;
}

const STANDARD_WORK_HOURS = 8;
const LATE_GRACE_MINUTES = 15;
const OVERTIME_RATE = 1.5;
const LATE_DEDUCTION_RATE = 0.25;

export function PayrollProcessing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createPeriodOpen, setCreatePeriodOpen] = useState(false);
  const [newPeriodMonth, setNewPeriodMonth] = useState(new Date().getMonth() + 1);
  const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [branches, setBranches] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    fetchData();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data } = await (supabase as any).from('branches').select('id, name');
    setBranches(data || []);
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPeriods(),
      fetchRuns(),
      fetchEmployees(),
    ]);
    setLoading(false);
  };

  const fetchPeriods = async () => {
    const { data } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    setPeriods(data || []);
  };

  const fetchRuns = async () => {
    const { data } = await supabase
      .from('payroll_runs')
      .select('*')
      .order('run_date', { ascending: false });
    setRuns(data || []);
  };




  // Add this inside the component
  const [taxSlabs, setTaxSlabs] = useState<TaxSlab[]>([]);

  useEffect(() => {
    fetchData();
    fetchBranches();
    loadTaxSlabs();
  }, []);

  const loadTaxSlabs = async () => {
    const slabs = await fetchActiveTaxSlabs();
    setTaxSlabs(slabs);
  };

  const fetchEmployees = async () => {
    // Fetch detailed salary structure if available
    const { data } = await (supabase as any)
      .from('employees')
      .select(`
        id, 
        full_name, 
        employee_code, 
        salary, 
        department:departments(name), 
        branch_id, 
        branch:branches!employees_branch_id_fkey(name),
        salary_structure:employee_salary_structures(
          basic_salary,
          house_rent_allowance,
          medical_allowance,
          utilities_allowance,
          special_allowance,
          is_eobi_applicable,
          provident_fund_percentage
        )
      `)
      .eq('status', 'active');

    // Transform data to include the single active structure if it exists
    const transformed = data?.map(emp => ({
      ...emp,
      salary_structure: emp.salary_structure?.[0] || null
    })) || [];

    setEmployees(transformed as any);
  };

  // ... (keep standard helper functions like calculateWorkingDays)

  const runPayroll = async () => {
    if (!selectedPeriod || !user) return;

    setProcessing(true);

    try {
      if (taxSlabs.length === 0) {
        toast({ title: 'Warning', description: 'No active tax slabs found. Tax will be 0.', variant: 'destructive' as const });
      }

      // Fetch leave data for the period
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('employee_id, total_days, leave_type:leave_types(is_paid)')
        .eq('status', 'approved')
        .gte('start_date', selectedPeriod.start_date)
        .lte('end_date', selectedPeriod.end_date);

      // Create a map of unpaid leave days per employee
      const unpaidLeaveMap = new Map<string, number>();
      leaveData?.forEach(leave => {
        if (!leave.leave_type?.is_paid) {
          const current = unpaidLeaveMap.get(leave.employee_id) || 0;
          unpaidLeaveMap.set(leave.employee_id, current + (leave.total_days || 0));
        }
      });

      // Fetch attendance data for the period
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('employee_id, check_in, check_out, work_hours, status')
        .gte('date', selectedPeriod.start_date)
        .lte('date', selectedPeriod.end_date);

      // Calculate overtime hours and late arrivals per employee
      const attendanceMap = new Map<string, {
        overtimeHours: number;
        lateArrivals: number;
        actualDaysWorked: number;
      }>();

      attendanceData?.forEach(record => {
        const current = attendanceMap.get(record.employee_id) || {
          overtimeHours: 0,
          lateArrivals: 0,
          actualDaysWorked: 0
        };

        // Count actual days worked
        if (record.status === 'present' || record.status === 'late') {
          current.actualDaysWorked += 1;
        }

        // Calculate overtime (hours beyond standard work hours)
        if (record.work_hours && record.work_hours > STANDARD_WORK_HOURS) {
          current.overtimeHours += record.work_hours - STANDARD_WORK_HOURS;
        }

        // Count late arrivals (check_in after 9:15 AM considering grace period)
        if (record.check_in) {
          const checkInTime = new Date(record.check_in);
          const checkInHour = checkInTime.getHours();
          const checkInMinutes = checkInTime.getMinutes();
          // Standard work start: 9:00 AM + 15 min grace = 9:15 AM
          if (checkInHour > 9 || (checkInHour === 9 && checkInMinutes > LATE_GRACE_MINUTES)) {
            current.lateArrivals += 1;
          }
        }

        attendanceMap.set(record.employee_id, current);
      });

      // Create payroll run
      const { data: runData, error: runError } = await supabase
        .from('payroll_runs')
        .insert({
          period_id: selectedPeriod.id,
          run_by: user.id,
          status: 'processing',
        })
        .select()
        .single();

      if (runError) throw runError;

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      // Filter employees based on selected branch
      const filteredEmployees = employees.filter(emp => selectedBranch === 'all' || emp.branch_id === selectedBranch);

      // Generate payslips for each employee
      for (const employee of filteredEmployees) {
        // --- 1. Determine Base Salary & Allowances ---
        // Use structured data if valid, otherwise fallback to flat salary
        const structure = (employee as any).salary_structure;
        let basicSalary = 0;
        let allowances = 0;
        let hra = 0, medical = 0, utilities = 0, special = 0;
        let pfRate = 0;
        let isEobi = true;

        if (structure && structure.basic_salary > 0) {
          basicSalary = Number(structure.basic_salary);
          hra = Number(structure.house_rent_allowance || 0);
          medical = Number(structure.medical_allowance || 0);
          utilities = Number(structure.utilities_allowance || 0);
          special = Number(structure.special_allowance || 0);
          allowances = hra + medical + utilities + special;
          pfRate = Number(structure.provident_fund_percentage || 0);
          isEobi = structure.is_eobi_applicable;
        } else {
          // Fallback: Assume 60-40 split or just flat Basic if simple
          // For simplicity in fallback: 100% Basic
          basicSalary = Number(employee.salary || 0);
        }

        const standardMonthlyGross = basicSalary + allowances;

        // --- 2. Calculate Variable Pay/Deductions based on Attendance ---
        const unpaidLeaveDays = unpaidLeaveMap.get(employee.id) || 0;
        const dailyRate = standardMonthlyGross / selectedPeriod.working_days;
        const hourlyRate = dailyRate / STANDARD_WORK_HOURS;

        const leaveDeduction = unpaidLeaveDays * dailyRate;

        // Get attendance data for this employee
        const attendance = attendanceMap.get(employee.id) || {
          overtimeHours: 0,
          lateArrivals: 0,
          actualDaysWorked: 0
        };

        // Calculate overtime pay (1.5x hourly rate)
        const overtimeAmount = attendance.overtimeHours * hourlyRate * OVERTIME_RATE;

        // Calculate late arrival deduction (25% of hourly rate per late)
        const lateDeduction = attendance.lateArrivals * hourlyRate * LATE_DEDUCTION_RATE;

        // Actual Gross for this month (Earnings)
        const currentGross = standardMonthlyGross + overtimeAmount - leaveDeduction - lateDeduction;

        // --- 3. Calculate Tax (FBR) ---
        // Projection: Annualize the current month's earnings
        // Note: For more accuracy, one should take YTD earnings + (currentGross * remaining_months). 
        // For now, simpler annualized projection: currentGross * 12
        // We use standardMonthlyGross * 12 for tax slab projection usually, or currentGross. 
        // FBR usually taxes "Subject to tax" income. If unpaid leave reduces income, tax reduces.
        const annualIncome = currentGross * 12;
        const annualTax = calculateAnnualTax(annualIncome, taxSlabs);
        const monthlyTax = annualTax / 12;

        // --- 4. Statutory Deductions ---

        // Provident Fund (Applicable on Basic)
        // If percentage is set in structure, use it. Else default 0 or standard.
        const pfDeduction = pfRate > 0 ? basicSalary * (pfRate / 100) : 0;

        // EOBI
        // Using utility (1% of capped wages often, or fixed)
        const eobiDeduction = calculateEOBI(basicSalary, isEobi);

        // Fetch health insurance for employee
        const { data: healthInsurance } = await supabase
          .from('employee_health_insurance')
          .select('employee_contribution')
          .eq('employee_id', employee.id)
          .eq('is_active', true)
          .maybeSingle();

        const healthInsuranceDeduction = healthInsurance?.employee_contribution || 0;

        // Social Security (SESSI)
        // Often employer paid, but if employee contribution exists:
        // skipping for now unless configured in structures (not yet active in UI)
        const socialSecurityDeduction = 0;

        // Fetch active loans for employee
        const { data: loans } = await supabase
          .from('employee_loans')
          .select('id, monthly_deduction, remaining_amount, completed_installments, total_installments')
          .eq('employee_id', employee.id)
          .eq('status', 'active');

        let loanDeduction = 0;
        if (loans && loans.length > 0) {
          for (const loan of loans) {
            if (loan.remaining_amount > 0) {
              const deduction = Math.min(loan.monthly_deduction, loan.remaining_amount);
              loanDeduction += deduction;

              // Update loan
              await supabase
                .from('employee_loans')
                .update({
                  remaining_amount: loan.remaining_amount - deduction,
                  completed_installments: (loan.completed_installments || 0) + 1,
                  status: (loan.remaining_amount - deduction) <= 0 ? 'completed' : 'active'
                })
                .eq('id', loan.id);
            }
          }
        }

        // Check for pending salary advances
        const { data: advances } = await supabase
          .from('salary_advances')
          .select('id, amount, recovered_amount, installments')
          .eq('employee_id', employee.id)
          .eq('status', 'approved');

        let advanceDeduction = 0;
        if (advances && advances.length > 0) {
          for (const advance of advances) {
            const remaining = advance.amount - (advance.recovered_amount || 0);
            if (remaining > 0) {
              const monthlyDeduction = advance.amount / (advance.installments || 1);
              const deduction = Math.min(remaining, monthlyDeduction);
              advanceDeduction += deduction;

              // Update advance recovery
              await supabase
                .from('salary_advances')
                .update({
                  recovered_amount: (advance.recovered_amount || 0) + deduction,
                  status: (remaining - deduction) <= 0 ? 'completed' : 'approved'
                })
                .eq('id', advance.id);
            }
          }
        }

        // Total deductions (all components)
        const totalDeduction = monthlyTax + pfDeduction + eobiDeduction + advanceDeduction +
          lateDeduction + healthInsuranceDeduction + socialSecurityDeduction + loanDeduction;

        // Net Salary
        // Note: lateDeduction was already subtracted from 'currentGross'. 
        // But 'totalDeduction' includes it for display purposes?
        // Let's align: 
        // Gross Earnings (Payslip TOP) = currentGross (includes Overtime, excludes Leave/Late deduction already? No usually Gross is Basic + Allowances + OT).
        // Deductions (Payslip BOTTOM) = Tax + PF + Loan + Late + Leave.
        // Let's calculate 'Gross Credits' vs 'Gross Debits'.

        // Redefine for transparency:
        const grossEarnings = basicSalary + allowances + overtimeAmount; // Pure earnings
        const totalDeductionsCalc = monthlyTax + pfDeduction + eobiDeduction + advanceDeduction +
          loanDeduction + healthInsuranceDeduction +
          lateDeduction + leaveDeduction; // All negatives

        const netSalary = grossEarnings - totalDeductionsCalc;

        // Days worked calculation - use attendance data if available, otherwise estimate
        const daysWorked = attendance.actualDaysWorked > 0
          ? attendance.actualDaysWorked
          : selectedPeriod.working_days - unpaidLeaveDays;

        const { data: payslipData } = await supabase.from('payslips').insert({
          payroll_run_id: runData.id,
          employee_id: employee.id,
          period_id: selectedPeriod.id,
          basic_salary: basicSalary,
          allowances: allowances, // Store allowances sum
          gross_earnings: grossEarnings,
          total_allowances: allowances,
          overtime_hours: attendance.overtimeHours,
          overtime_amount: overtimeAmount,
          tax_amount: monthlyTax,
          provident_fund: pfDeduction,
          eobi_amount: eobiDeduction,
          advance_deduction: advanceDeduction,
          loan_deduction: loanDeduction,
          health_insurance_deduction: healthInsuranceDeduction,
          social_security_deduction: socialSecurityDeduction,
          late_deduction: lateDeduction,
          leave_deduction: leaveDeduction,
          other_deductions: 0,
          total_deductions: totalDeductionsCalc,
          net_salary: netSalary,
          working_days: selectedPeriod.working_days,
          days_worked: daysWorked,
          leaves_taken: unpaidLeaveDays,
          unpaid_leaves: unpaidLeaveDays,
          status: 'generated',
        }).select().single();

        // Create audit log entry for payslip
        await supabase.from('payroll_audit_logs').insert({
          action_type: 'payslip_generated',
          action_description: `Payslip generated for ${employee.full_name} - Net: PKR ${netSalary.toFixed(0)}`,
          entity_type: 'payslip',
          entity_id: payslipData?.id,
          employee_id: employee.id,
          period_id: selectedPeriod.id,
          amount: netSalary,
          performed_by: user.id,
          new_values: {
            gross: grossEarnings,
            tax: monthlyTax,
            pf: pfDeduction,
            eobi: eobiDeduction, // Log EOBI
            net: netSalary,
            base: basicSalary
          }
        });

        totalGross += grossEarnings;
        totalDeductions += totalDeductionsCalc;
        totalNet += netSalary;
      }

      // Update payroll run with totals
      await supabase
        .from('payroll_runs')
        .update({
          status: 'completed',
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet,
          employee_count: filteredEmployees.length,
        })
        .eq('id', runData.id);

      // Create audit log for payroll run completion
      await supabase.from('payroll_audit_logs').insert({
        action_type: 'payroll_run',
        action_description: `Payroll completed for ${selectedPeriod.name} - ${filteredEmployees.length} employees, Total Net: PKR ${totalNet.toFixed(0)}`,
        entity_type: 'payroll_run',
        entity_id: runData.id,
        period_id: selectedPeriod.id,
        amount: totalNet,
        performed_by: user.id,
        new_values: {
          employee_count: filteredEmployees.length,
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet
        }
      });

      // Update period status
      await supabase
        .from('payroll_periods')
        .update({ status: 'closed' })
        .eq('id', selectedPeriod.id);

      toast({
        title: 'Payroll Processed',
        description: `Generated ${filteredEmployees.length} payslips totaling ${formatCurrency(totalNet)}`,
      });

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Payroll processing error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process payroll',
        variant: 'destructive',
      });
    }

    setProcessing(false);
  };


  const calculateWorkingDays = (year: number, month: number) => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });
    return days.filter(day => !isWeekend(day)).length;
  };

  const createPayrollPeriod = async () => {
    if (!newPeriodYear || !newPeriodMonth) {
      toast({
        title: 'Validation Error',
        description: 'Please select a valid year and month',
        variant: 'destructive',
      });
      return;
    }

    // Check if period already exists locally
    const existing = periods.find(p => p.year === newPeriodYear && p.month === newPeriodMonth);
    if (existing) {
      toast({
        title: 'Duplicate Period',
        description: `Payroll period for ${newPeriodMonth}/${newPeriodYear} already exists.`,
        variant: 'destructive' as const,
      });
      return;
    }

    const start = startOfMonth(new Date(newPeriodYear, newPeriodMonth - 1));
    const end = endOfMonth(new Date(newPeriodYear, newPeriodMonth - 1));
    const workingDays = calculateWorkingDays(newPeriodYear, newPeriodMonth);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const { error } = await supabase.from('payroll_periods').insert({
      name: `${monthNames[newPeriodMonth - 1]} ${newPeriodYear}`,
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd'),
      year: newPeriodYear,
      month: newPeriodMonth,
      working_days: workingDays,
      status: 'open',
    });

    if (error) {
      console.error('Error creating period:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create period',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Success', description: 'Payroll period created' });
      setCreatePeriodOpen(false);
      fetchPeriods();
    }
  };

  const deletePayrollPeriod = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the payroll period "${name}"? This action cannot be undone.`)) {
      return;
    }

    // Check if there are runs
    const { count } = await supabase
      .from('payroll_runs')
      .select('*', { count: 'exact', head: true })
      .eq('period_id', id);

    if (count && count > 0) {
      toast({
        title: 'Cannot Delete',
        description: 'This period contains payroll runs. Please delete them first.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('payroll_periods')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete period',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Success', description: 'Payroll period deleted' });
      fetchPeriods();
      if (selectedPeriod?.id === id) setSelectedPeriod(null);
    }
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string; icon: typeof Clock }> = {
      open: { color: 'bg-success/20 text-success', label: 'Open', icon: CheckCircle },
      processing: { color: 'bg-warning/20 text-warning', label: 'Processing', icon: RefreshCw },
      closed: { color: 'bg-muted text-muted-foreground', label: 'Closed', icon: XCircle },
      locked: { color: 'bg-destructive/20 text-destructive', label: 'Locked', icon: AlertTriangle },
      draft: { color: 'bg-muted text-muted-foreground', label: 'Draft', icon: Clock },
      completed: { color: 'bg-success/20 text-success', label: 'Completed', icon: CheckCircle },
      approved: { color: 'bg-primary/20 text-primary', label: 'Approved', icon: CheckCircle },
      paid: { color: 'bg-accent/20 text-accent', label: 'Paid', icon: DollarSign },
    };
    const c = config[status] || config.draft;
    const Icon = c.icon;
    return (
      <Badge variant="outline" className={cn('font-medium gap-1', c.color)}>
        <Icon className="w-3 h-3" />
        {c.label}
      </Badge>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Payroll Periods */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Payroll Periods
                </CardTitle>
                <CardDescription>Manage monthly payroll cycles</CardDescription>
              </div>
              <Button onClick={() => setCreatePeriodOpen(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Create Period
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-12 bg-muted rounded" />
                ))}
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No payroll periods created yet</p>
                <Button className="mt-4" onClick={() => setCreatePeriodOpen(true)}>
                  Create First Period
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.name}</TableCell>
                      <TableCell>
                        {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{period.working_days} days</TableCell>
                      <TableCell>{getStatusBadge(period.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={period.status !== 'open'}
                            onClick={() => {
                              setSelectedPeriod(period);
                              setDialogOpen(true);
                            }}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Run Payroll
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0"
                            onClick={() => deletePayrollPeriod(period.id, period.name)}
                            title="Delete Period"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Payroll Runs */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Recent Payroll Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No payroll runs yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run Date</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{format(new Date(run.run_date), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {run.employee_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-success">{formatCurrency(run.total_gross)}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(run.total_deductions)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(run.total_net)}</TableCell>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Period Dialog */}
      <Dialog open={createPeriodOpen} onOpenChange={setCreatePeriodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payroll Period</DialogTitle>
            <DialogDescription>Set up a new monthly payroll cycle</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={newPeriodMonth.toString()} onValueChange={(v) => setNewPeriodMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>{month}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={newPeriodYear.toString()} onValueChange={(v) => setNewPeriodYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Working days: {calculateWorkingDays(newPeriodYear, newPeriodMonth)}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePeriodOpen(false)}>Cancel</Button>
            <Button onClick={createPayrollPeriod}>Create Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Payroll Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
            <DialogDescription>
              Process payroll for {selectedPeriod?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period</span>
                <span className="font-medium">{selectedPeriod?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Working Days</span>
                <span className="font-medium">{selectedPeriod?.working_days}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employees</span>
                <span className="font-medium">
                  {selectedBranch === 'all' ? employees.length : employees.filter(e => e.branch_id === selectedBranch).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Branch Filter</span>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[180px] h-8">
                    <Building className="w-3 h-3 mr-2" />
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Important</p>
                  <p className="text-muted-foreground">
                    This will generate payslips for all active employees. Make sure all salary structures and attendance records are up to date.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={runPayroll} disabled={processing}>
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Payroll
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
