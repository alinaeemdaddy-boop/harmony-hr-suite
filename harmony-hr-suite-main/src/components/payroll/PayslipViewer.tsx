import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Printer,
  Building2,
  User,
  Briefcase,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Receipt,

  AlertCircle,
  Plus,
  Trash2,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { exportPayslipsToPDF, exportPayslipsToExcel, exportPayslipsToWord, ExportablePayslip } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { ManualPayslipDialog } from './ManualPayslipDialog';

interface Payslip {
  id: string;
  employee_id: string;
  period_id: string;
  basic_salary: number;
  gross_earnings: number;
  total_allowances: number;
  overtime_amount: number;
  bonus_amount: number;
  total_deductions: number;
  tax_amount: number;
  provident_fund: number;
  eobi_amount: number;
  loan_deduction: number;
  advance_deduction: number;
  leave_deduction: number;
  other_deductions: number;
  health_insurance_deduction: number;
  social_security_deduction: number;
  late_deduction: number;
  net_salary: number;
  working_days: number;
  days_worked: number;
  leaves_taken: number;
  unpaid_leaves: number;
  overtime_hours: number;
  status: string;
  payment_date: string | null;
  created_at: string;
  employee: {
    full_name: string;
    employee_code: string;
    email: string;
    designation: string | null;
    department: { name: string } | null;
  };
  period: {
    name: string;
    month: number;
    year: number;
  };
}

interface PayslipViewerProps {
  employeeId?: string;
  showAllEmployees?: boolean;
}

export function PayslipViewer({ employeeId, showAllEmployees = false }: PayslipViewerProps) {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [manualPayslipOpen, setManualPayslipOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    fetchPayslips();
  }, [employeeId, showAllEmployees, yearFilter]);

  const fetchPayslips = async () => {
    setLoading(true);

    let query = supabase
      .from('payslips')
      .select(`
        *,
        employee:employees(full_name, employee_code, email, designation, department:departments(name)),
        period:payroll_periods(name, month, year)
      `)
      .order('created_at', { ascending: false });

    if (!showAllEmployees && employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payslips:', error);
    } else {
      setPayslips(data || []);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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

  const filteredPayslips = payslips.filter((payslip) => {
    const matchesSearch =
      payslip.employee?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payslip.employee?.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payslip.status === statusFilter;
    const matchesYear = payslip.period?.year.toString() === yearFilter;
    return matchesSearch && matchesStatus && matchesYear;
  });

  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const mapToExportable = (p: Payslip): ExportablePayslip => ({
    id: p.id,
    employee_name: p.employee?.full_name || 'N/A',
    employee_code: p.employee?.employee_code || 'N/A',
    designation: p.employee?.designation || 'N/A',
    department: p.employee?.department?.name || 'N/A',
    period_name: p.period?.name || `${p.period?.month}/${p.period?.year}`,
    basic_salary: p.basic_salary,
    allowances: p.total_allowances,
    gross_earnings: p.gross_earnings,
    tax_amount: p.tax_amount,
    provident_fund: p.provident_fund,
    eobi_amount: p.eobi_amount,
    loan_deduction: p.loan_deduction,
    advance_deduction: p.advance_deduction,
    other_deductions: p.other_deductions,
    total_deductions: p.total_deductions,
    net_salary: p.net_salary,
    payment_date: p.payment_date || p.created_at,
    working_days: p.working_days,
    days_worked: p.days_worked,
    leaves_taken: p.leaves_taken,
    overtime_amount: p.overtime_amount,
  });

  const handleDownload = (format: 'PDF' | 'Excel' | 'Word') => {
    if (!selectedPayslip) return;

    const exportData = [mapToExportable(selectedPayslip)];
    const filename = `Payslip_${selectedPayslip.employee?.employee_code}_${selectedPayslip.period?.name}`;

    try {
      if (format === 'PDF') exportPayslipsToPDF(exportData, filename);
      if (format === 'Excel') exportPayslipsToExcel(exportData, filename);
      if (format === 'Word') exportPayslipsToWord(exportData, filename);

      toast({ title: 'Download Started', description: `Downloading payslip as ${format}` });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to download payslip', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payslip?")) return;
    const { error } = await supabase.from('payslips').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete payslip', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Payslip deleted' });
      // Optimistic update
      setPayslips(payslips.filter(p => p.id !== id));
      if (selectedPayslip?.id === id) setSelectedPayslip(null);
    }
  };

  const handleEdit = (payslip: Payslip) => {
    setEditData(payslip);
    setManualPayslipOpen(true);
  };

  return (
    <>
      <Card className="bg-white border border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Pay Slips</CardTitle>
                <CardDescription>View and download salary statements</CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[180px] bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[100px] bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2025, 2024, 2023].map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {showAllEmployees && (
                <Button onClick={() => { setEditData(null); setManualPayslipOpen(true); }} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Payslip
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-medium text-muted-foreground">No payslips found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Payslips will appear here once processed</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    {showAllEmployees && <TableHead className="font-semibold">Employee</TableHead>}
                    <TableHead className="font-semibold">Period</TableHead>
                    <TableHead className="font-semibold">Gross</TableHead>
                    <TableHead className="font-semibold">Deductions</TableHead>
                    <TableHead className="font-semibold">Net Pay</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayslips.map((payslip) => (
                    <TableRow
                      key={payslip.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {showAllEmployees && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {payslip.employee?.full_name?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{payslip.employee?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{payslip.employee?.employee_code}</p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{payslip.period?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(payslip.gross_earnings)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-amber-600">
                          {formatCurrency(payslip.total_deductions)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">
                          {formatCurrency(payslip.net_salary)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(payslip.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPayslip(payslip)}
                            className="gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>

                          {showAllEmployees && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEdit(payslip)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(payslip.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslip Detail Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Pay Slip - {selectedPayslip?.period?.name}</DialogTitle>
                <DialogDescription>
                  {selectedPayslip?.employee?.full_name} ({selectedPayslip?.employee?.employee_code})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedPayslip && (
            <div className="space-y-6 py-6" id="payslip-content">
              {/* Official Header */}
              <div className="text-center space-y-2 border-b-2 border-primary/20 pb-6 mb-6">
                <img
                  src="/sl-logo.png"
                  alt="SL Aesthetics Clinic"
                  className="h-20 mx-auto object-contain mb-2"
                />
                <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">SL AESTHETICS CLINIC</h2>
                <div className="flex items-center justify-center gap-4 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  <span>Official Salary Statement</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                  <span>Confidential</span>
                </div>
              </div>

              {/* Employee Info Section */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Employee Name</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedPayslip.employee?.full_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Employee ID</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedPayslip.employee?.employee_code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Position</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedPayslip.employee?.designation || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Pay Period</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedPayslip.period?.name}</p>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="w-[35%] font-bold text-emerald-700">Earnings</TableHead>
                      <TableHead className="w-[15%] text-right font-bold text-emerald-700">Amount</TableHead>
                      <TableHead className="w-[35%] font-bold text-amber-700 border-l">Deductions</TableHead>
                      <TableHead className="w-[15%] text-right font-bold text-amber-700">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="py-2 text-sm text-slate-600">Basic Salary</TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium">{formatCurrency(selectedPayslip.basic_salary)}</TableCell>
                      <TableCell className="py-2 text-sm text-slate-600 border-l">Income Tax</TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium">{formatCurrency(selectedPayslip.tax_amount || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-2 text-sm text-slate-600">Allowances</TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium">{formatCurrency(selectedPayslip.total_allowances)}</TableCell>
                      <TableCell className="py-2 text-sm text-slate-600 border-l">Social Security (EOBI)</TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium">{formatCurrency(selectedPayslip.eobi_amount || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-2 text-sm text-slate-600">Overtime / Bonuses</TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium">{formatCurrency((selectedPayslip.overtime_amount || 0) + (selectedPayslip.bonus_amount || 0))}</TableCell>
                      <TableCell className="py-2 text-sm text-slate-600 border-l">Loan/Advances</TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium">{formatCurrency((selectedPayslip.loan_deduction || 0) + (selectedPayslip.advance_deduction || 0))}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-2 text-sm text-slate-600"></TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium"></TableCell>
                      <TableCell className="py-2 text-sm text-slate-600 border-l">Other Deductions</TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium">{formatCurrency(selectedPayslip.other_deductions || 0)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-slate-50/50 font-bold">
                      <TableCell className="py-3 text-emerald-700">Gross Earnings</TableCell>
                      <TableCell className="py-3 text-right text-emerald-700">{formatCurrency(selectedPayslip.gross_earnings)}</TableCell>
                      <TableCell className="py-3 text-amber-700 border-l">Total Deductions</TableCell>
                      <TableCell className="py-3 text-right text-amber-700">{formatCurrency(selectedPayslip.total_deductions)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Net Pay Highlight */}
              <div className="p-6 rounded-2xl bg-primary shadow-lg shadow-primary/20 text-primary-foreground transform transition-all hover:scale-[1.01]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Final Net Salary</p>
                    <p className="text-3xl font-display font-bold">{formatCurrency(selectedPayslip.net_salary)}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <Badge variant="outline" className="bg-white/20 border-white/30 text-white font-bold py-1 px-3">
                      {selectedPayslip.status.toUpperCase()}
                    </Badge>
                    <p className="text-[10px] opacity-70 italic font-medium">Verified Payment Amount</p>
                  </div>
                </div>
              </div>

              {/* Signature & Footer Info */}
              <div className="pt-10 grid grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date of Issue</p>
                    <p className="text-sm font-semibold">{format(new Date(), 'dd MMMM yyyy')}</p>
                  </div>
                  <div className="pt-1 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Contact Info</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                      SL Aesthetics Clinic<br />
                      Main Plaza, Medical District<br />
                      Tel: +1 (555) 123-4567 • info@slaesthetics.com
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-end">
                  <div className="w-full max-w-[200px] border-b-2 border-slate-900 pb-2">
                    {/* Placeholder for Signature */}
                    <div className="h-12 w-full flex items-center justify-center italic text-muted-foreground/30 font-serif">
                      Clinic Director Signature
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mt-2">Authority Signature</p>
                </div>
              </div>

              {/* Action Buttons (Hidden on Print) */}
              <div className="flex justify-between gap-4 pt-8 border-t border-border/50 print:hidden">
                <div className="flex gap-2">
                  {showAllEmployees && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedPayslip(null); handleEdit(selectedPayslip!); }}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(selectedPayslip!.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="gap-2 border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    Print
                  </Button>

                  <div className="flex gap-1.5 p-1 rounded-lg bg-slate-100/50 border border-slate-200">
                    <Button variant="ghost" size="sm" onClick={() => handleDownload('Word')} className="text-xs hover:bg-white transition-all shadow-none">
                      DOCX
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload('Excel')} className="text-xs hover:bg-white transition-all shadow-none">
                      XLSX
                    </Button>
                    <Button size="sm" className="gap-2 bg-slate-900 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200" onClick={() => handleDownload('PDF')}>
                      <Download className="w-4 h-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ManualPayslipDialog
        open={manualPayslipOpen}
        onOpenChange={setManualPayslipOpen}
        initialData={editData}
        onSuccess={fetchPayslips}
      />
    </>
  );
}
