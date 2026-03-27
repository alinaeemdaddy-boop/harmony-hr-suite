import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Banknote,
  Plus,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SalaryAdvance {
  id: string;
  employee_id: string;
  amount: number;
  reason: string | null;
  request_date: string;
  status: string;
  installments: number;
  recovered_amount: number;
  rejection_reason: string | null;
  created_at: string;
  employee?: {
    full_name: string;
    employee_code: string;
  };
}

interface AdvanceRequestFormProps {
  employeeId?: string;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

export function AdvanceRequestForm({ employeeId, isAdmin = false, onRefresh }: AdvanceRequestFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState<{ advance: SalaryAdvance; action: 'approve' | 'reject' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    installments: '1',
  });

  useEffect(() => {
    fetchAdvances();
  }, [employeeId, isAdmin]);

  const fetchAdvances = async () => {
    setLoading(true);

    let query = supabase
      .from('salary_advances')
      .select('*, employee:employees(full_name, employee_code)')
      .order('created_at', { ascending: false });

    if (!isAdmin && employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (!error) {
      setAdvances(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!employeeId || !formData.amount) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('salary_advances').insert({
      employee_id: employeeId,
      amount: parseFloat(formData.amount),
      reason: formData.reason,
      installments: parseInt(formData.installments),
      status: 'pending',
      request_date: new Date().toISOString(),
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit advance request',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Salary advance request submitted',
      });
      setDialogOpen(false);
      setFormData({ amount: '', reason: '', installments: '1' });
      fetchAdvances();
      onRefresh?.();
    }

    setSubmitting(false);
  };

  const handleApproval = async () => {
    if (!approvalDialog || !user) return;

    setSubmitting(true);

    const updateData: Record<string, unknown> = {
      status: approvalDialog.action === 'approve' ? 'approved' : 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    if (approvalDialog.action === 'reject') {
      updateData.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
      .from('salary_advances')
      .update(updateData)
      .eq('id', approvalDialog.advance.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to process request',
        variant: 'destructive',
      });
    } else {
      toast({
        title: approvalDialog.action === 'approve' ? 'Approved' : 'Rejected',
        description: `Advance request has been ${approvalDialog.action}d`,
      });
      setApprovalDialog(null);
      setRejectionReason('');
      fetchAdvances();
      onRefresh?.();
    }

    setSubmitting(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string; icon: any }> = {
      pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending', icon: Clock },
      approved: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Approved', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-600 border-red-200', label: 'Rejected', icon: AlertCircle },
      disbursed: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Disbursed', icon: DollarSign },
      recovered: { color: 'bg-primary/10 text-primary border-primary/20', label: 'Recovered', icon: CheckCircle },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge variant="outline" className={cn('font-medium gap-1 border', c.color)}>
        <Icon className="w-3 h-3" />
        {c.label}
      </Badge>
    );
  };

  return (
    <>
      <Card className="bg-white border border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Banknote className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Salary Advances</CardTitle>
                <CardDescription>
                  {isAdmin ? 'Manage employee advance requests' : 'Request and track salary advances'}
                </CardDescription>
              </div>
            </div>
            {!isAdmin && employeeId && (
              <Button
                onClick={() => setDialogOpen(true)}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Request Advance
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : advances.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Banknote className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-medium text-muted-foreground">No advance requests</p>
              {!isAdmin && employeeId && (
                <Button className="mt-4 gap-2" variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Request Your First Advance
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    {isAdmin && <TableHead className="font-semibold">Employee</TableHead>}
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Installments</TableHead>
                    <TableHead className="font-semibold">Request Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    {isAdmin && <TableHead className="text-right font-semibold">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map((advance) => (
                    <TableRow key={advance.id} className="hover:bg-slate-50/50">
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {advance.employee?.full_name?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{advance.employee?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{advance.employee?.employee_code}</p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-bold text-primary">{formatCurrency(advance.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50">
                          {advance.installments} months
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(advance.request_date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(advance.status)}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm text-muted-foreground">
                          {advance.reason || '-'}
                        </p>
                        {advance.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            Rejected: {advance.rejection_reason}
                          </p>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {advance.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                                onClick={() => setApprovalDialog({ advance, action: 'approve' })}
                              >
                                <Check className="w-4 h-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setApprovalDialog({ advance, action: 'reject' })}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Advance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Banknote className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Request Salary Advance</DialogTitle>
                <DialogDescription>
                  Submit a request for salary advance
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Amount (PKR) *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                className="bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Number of Installments</Label>
              <Input
                type="number"
                min="1"
                max="12"
                value={formData.installments}
                onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                className="bg-slate-50 border-slate-200 focus:bg-white"
              />
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-sm text-blue-700">
                  Monthly deduction: {formData.amount && formData.installments
                    ? <span className="font-bold">{formatCurrency(parseFloat(formData.amount) / parseInt(formData.installments))}</span>
                    : '-'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reason</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Explain why you need this advance..."
                className="bg-slate-50 border-slate-200 focus:bg-white min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formData.amount}
              className="bg-primary hover:bg-primary/90"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => {
        setApprovalDialog(null);
        setRejectionReason('');
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl",
                approvalDialog?.action === 'approve' ? 'bg-emerald-100' : 'bg-red-100'
              )}>
                {approvalDialog?.action === 'approve'
                  ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                  : <AlertCircle className="w-5 h-5 text-red-600" />
                }
              </div>
              <div>
                <DialogTitle>
                  {approvalDialog?.action === 'approve' ? 'Approve' : 'Reject'} Request
                </DialogTitle>
                <DialogDescription>
                  {approvalDialog?.action === 'approve'
                    ? 'Confirm approval of this advance request'
                    : 'Please provide a reason for rejection'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {approvalDialog && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Employee</span>
                  </div>
                  <span className="font-medium">{approvalDialog.advance.employee?.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Amount</span>
                  </div>
                  <span className="font-bold text-primary">{formatCurrency(approvalDialog.advance.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Installments</span>
                  </div>
                  <span className="font-medium">{approvalDialog.advance.installments} months</span>
                </div>
              </div>

              {approvalDialog.action === 'reject' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Rejection Reason *</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide reason for rejection..."
                    className="bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => {
              setApprovalDialog(null);
              setRejectionReason('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={submitting || (approvalDialog?.action === 'reject' && !rejectionReason)}
              className={approvalDialog?.action === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? 'Processing...' : approvalDialog?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
