import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Search, 
  Eye,
  Download,
  RefreshCw,
  User,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  Calculator,
  XCircle,
  AlertTriangle,
  Clock,
  Activity
} from 'lucide-react';
import { format, subDays, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  action_type: string;
  action_description: string;
  entity_type: string;
  entity_id: string | null;
  employee_id: string | null;
  period_id: string | null;
  old_values: any;
  new_values: any;
  amount: number | null;
  performed_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  employee?: { full_name: string; employee_code: string } | null;
  performer?: { full_name: string } | null;
  period?: { name: string } | null;
}

export function PayrollAuditLog() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('30');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [dateFilter]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    
    const daysAgo = parseInt(dateFilter);
    const startDate = subDays(new Date(), daysAgo).toISOString();
    
    const { data, error } = await supabase
      .from('payroll_audit_logs')
      .select(`
        *,
        employee:employees(full_name, employee_code),
        period:payroll_periods(name)
      `)
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive',
      });
    } else {
      setLogs(data || []);
    }
    
    setLoading(false);
  };

  const filterLogs = () => {
    let filtered = [...logs];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.action_description.toLowerCase().includes(term) ||
        log.employee?.full_name?.toLowerCase().includes(term) ||
        log.employee?.employee_code?.toLowerCase().includes(term) ||
        log.entity_type.toLowerCase().includes(term)
      );
    }
    
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action_type === actionFilter);
    }
    
    setFilteredLogs(filtered);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getActionIcon = (actionType: string) => {
    const icons: Record<string, typeof Activity> = {
      payroll_run: Activity,
      payslip_generated: FileText,
      advance_approved: CheckCircle,
      advance_rejected: XCircle,
      reimbursement_processed: DollarSign,
      salary_updated: DollarSign,
      loan_created: FileText,
      loan_payment: DollarSign,
      tax_calculated: Calculator,
    };
    return icons[actionType] || Activity;
  };

  const getActionBadge = (actionType: string) => {
    const config: Record<string, { color: string; label: string }> = {
      payroll_run: { color: 'bg-primary/20 text-primary', label: 'Payroll Run' },
      payslip_generated: { color: 'bg-success/20 text-success', label: 'Payslip Generated' },
      advance_approved: { color: 'bg-success/20 text-success', label: 'Advance Approved' },
      advance_rejected: { color: 'bg-destructive/20 text-destructive', label: 'Advance Rejected' },
      reimbursement_processed: { color: 'bg-accent/20 text-accent', label: 'Reimbursement' },
      salary_updated: { color: 'bg-warning/20 text-warning', label: 'Salary Updated' },
      loan_created: { color: 'bg-primary/20 text-primary', label: 'Loan Created' },
      loan_payment: { color: 'bg-success/20 text-success', label: 'Loan Payment' },
      tax_calculated: { color: 'bg-muted text-muted-foreground', label: 'Tax Calculated' },
    };
    const c = config[actionType] || { color: 'bg-muted text-muted-foreground', label: actionType };
    return <Badge variant="outline" className={cn('font-medium', c.color)}>{c.label}</Badge>;
  };

  const getEntityBadge = (entityType: string) => {
    const config: Record<string, { color: string; label: string }> = {
      payroll_run: { color: 'bg-primary/10 text-primary', label: 'Payroll Run' },
      payslip: { color: 'bg-success/10 text-success', label: 'Payslip' },
      salary_advance: { color: 'bg-warning/10 text-warning', label: 'Advance' },
      reimbursement: { color: 'bg-accent/10 text-accent', label: 'Reimbursement' },
      employee: { color: 'bg-muted text-muted-foreground', label: 'Employee' },
      loan: { color: 'bg-primary/10 text-primary', label: 'Loan' },
    };
    const c = config[entityType] || { color: 'bg-muted text-muted-foreground', label: entityType };
    return <Badge variant="secondary" className={cn('text-xs', c.color)}>{c.label}</Badge>;
  };

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'payroll_run', label: 'Payroll Runs' },
    { value: 'payslip_generated', label: 'Payslips Generated' },
    { value: 'advance_approved', label: 'Advances Approved' },
    { value: 'advance_rejected', label: 'Advances Rejected' },
    { value: 'reimbursement_processed', label: 'Reimbursements' },
    { value: 'salary_updated', label: 'Salary Updates' },
    { value: 'loan_created', label: 'Loans Created' },
    { value: 'loan_payment', label: 'Loan Payments' },
  ];

  const dateRanges = [
    { value: '7', label: 'Last 7 Days' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: '180', label: 'Last 6 Months' },
    { value: '365', label: 'Last Year' },
  ];

  const exportLogs = () => {
    toast({
      title: 'Export Started',
      description: 'Generating audit log export...',
    });
    // TODO: Implement actual export
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by description, employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {dateRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Audit Trail
          </CardTitle>
          <CardDescription>
            Complete history of all payroll-related activities ({filteredLogs.length} records)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-muted rounded" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              <p className="text-sm mt-2">Activities will appear here once payroll processing begins</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const Icon = getActionIcon(log.action_type);
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {format(new Date(log.created_at), 'MMM d, yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getActionBadge(log.action_type)}
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate">
                          {log.action_description}
                        </TableCell>
                        <TableCell>
                          {getEntityBadge(log.entity_type)}
                        </TableCell>
                        <TableCell>
                          {log.employee ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{log.employee.full_name}</p>
                                <p className="text-xs text-muted-foreground">{log.employee.employee_code}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {log.amount ? (
                            <span className={log.amount >= 0 ? 'text-success' : 'text-destructive'}>
                              {formatCurrency(log.amount)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this activity
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="font-medium">
                      {format(new Date(selectedLog.created_at), 'PPpp')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Action Type</p>
                    {getActionBadge(selectedLog.action_type)}
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{selectedLog.action_description}</p>
                  </div>
                  {selectedLog.employee && (
                    <div>
                      <p className="text-sm text-muted-foreground">Employee</p>
                      <p className="font-medium">{selectedLog.employee.full_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedLog.employee.employee_code}</p>
                    </div>
                  )}
                  {selectedLog.period && (
                    <div>
                      <p className="text-sm text-muted-foreground">Period</p>
                      <p className="font-medium">{selectedLog.period.name}</p>
                    </div>
                  )}
                  {selectedLog.amount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium text-primary">{formatCurrency(selectedLog.amount)}</p>
                    </div>
                  )}
                </div>

                {(selectedLog.old_values || selectedLog.new_values) && (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Changes</p>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLog.old_values && (
                        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                          <p className="text-sm font-medium text-destructive mb-2">Previous Values</p>
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(selectedLog.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.new_values && (
                        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                          <p className="text-sm font-medium text-success mb-2">New Values</p>
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(selectedLog.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entity Type</p>
                      {getEntityBadge(selectedLog.entity_type)}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entity ID</p>
                      <p className="font-mono text-xs">{selectedLog.entity_id || '-'}</p>
                    </div>
                    {selectedLog.ip_address && (
                      <div>
                        <p className="text-muted-foreground">IP Address</p>
                        <p className="font-mono text-xs">{selectedLog.ip_address}</p>
                      </div>
                    )}
                    {selectedLog.performed_by && (
                      <div>
                        <p className="text-muted-foreground">Performed By</p>
                        <p className="font-mono text-xs">{selectedLog.performed_by}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

