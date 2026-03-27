import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  ClipboardCheck, 
  Check, 
  X, 
  Clock, 
  User,
  Calendar,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { workflowTriggers } from '@/lib/workflow-triggers';

interface PendingRequest {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  total_days: number | null;
  half_day: boolean;
  created_at: string;
  employee: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    department: {
      name: string;
    } | null;
  };
  leave_type: {
    name: string;
    is_paid: boolean;
  } | null;
}

interface LeaveApprovalDashboardProps {
  onAction?: () => void;
}

export function LeaveApprovalDashboard({ onAction }: LeaveApprovalDashboardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees(id, full_name, email, avatar_url, department:departments(name)),
        leave_type:leave_types(name, is_paid)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending requests:', error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    
    setProcessing(true);

    const updateData: Record<string, unknown> = {
      status: actionType === 'approve' ? 'approved' : 'rejected',
      approved_at: actionType === 'approve' ? new Date().toISOString() : null,
      approved_by: user?.id,
    };

    if (actionType === 'reject') {
      updateData.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', selectedRequest.id);

    if (error) {
      console.error('Error updating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to process the request. Please try again.',
        variant: 'destructive',
      });
    } else {
      // Create audit log
      const { error: auditError } = await (supabase as any).from('leave_audit_logs').insert({
        leave_request_id: selectedRequest.id,
        action: actionType === 'approve' ? 'approved' : 'rejected',
        performed_by: user?.id,
        performed_by_name: user?.full_name,
        details: actionType === 'reject' ? { reason: rejectionReason } : null
      });

      if (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      toast({
        title: actionType === 'approve' ? 'Leave Approved' : 'Leave Rejected',
        description: `The leave request has been ${actionType === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });
      fetchPendingRequests();

      if (actionType === 'approve') {
        workflowTriggers.leaveRequestApproved(user?.id || '', {
          leave_request_id: selectedRequest.id,
          employee_id: selectedRequest.employee.id,
          leave_type: selectedRequest.leave_type?.name,
          start_date: selectedRequest.start_date,
          end_date: selectedRequest.end_date,
          total_days: selectedRequest.total_days,
        });
      } else {
        workflowTriggers.leaveRequestRejected(user?.id || '', {
          leave_request_id: selectedRequest.id,
          employee_id: selectedRequest.employee.id,
          leave_type: selectedRequest.leave_type?.name,
          start_date: selectedRequest.start_date,
          end_date: selectedRequest.end_date,
          rejection_reason: rejectionReason,
        });
      }

      onAction?.();
    }

    setProcessing(false);
    setSelectedRequest(null);
    setActionType(null);
    setRejectionReason('');
  };

  const openActionDialog = (request: PendingRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
  };

  const getDaysUntilStart = (startDate: string) => {
    const days = differenceInDays(new Date(startDate), new Date());
    if (days < 0) return { label: 'Started', urgent: true };
    if (days === 0) return { label: 'Today', urgent: true };
    if (days === 1) return { label: 'Tomorrow', urgent: true };
    if (days <= 3) return { label: `In ${days} days`, urgent: true };
    return { label: `In ${days} days`, urgent: false };
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="h-16 bg-muted rounded flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Pending Approvals
              </CardTitle>
              <CardDescription>
                {requests.length} request{requests.length !== 1 ? 's' : ''} awaiting your review
              </CardDescription>
            </div>
            {requests.length > 0 && (
              <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
                <Clock className="w-3 h-3 mr-1" />
                {requests.length} Pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Check className="w-12 h-12 mx-auto mb-4 text-success opacity-50" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No pending leave requests to review</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Starts</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const daysInfo = getDaysUntilStart(request.start_date);
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={request.employee.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {request.employee.full_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{request.employee.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {request.employee.department?.name || 'No Department'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{request.leave_type?.name || 'Unknown'}</span>
                            {request.half_day && (
                              <Badge variant="outline" className="text-xs">Half</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(request.start_date), 'MMM d')}</p>
                            {request.start_date !== request.end_date && (
                              <p className="text-muted-foreground">
                                to {format(new Date(request.end_date), 'MMM d')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{request.total_days || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              daysInfo.urgent 
                                ? 'bg-destructive/20 text-destructive border-destructive/30' 
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {daysInfo.urgent && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {daysInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <p className="truncate text-sm text-muted-foreground">
                            {request.reason || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => openActionDialog(request, 'approve')}
                              className="bg-success hover:bg-success/90"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openActionDialog(request, 'reject')}
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
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

      {/* Action Confirmation Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setRejectionReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Are you sure you want to approve this leave request?'
                : 'Please provide a reason for rejecting this leave request.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedRequest.employee.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedRequest.employee.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedRequest.employee.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.leave_type?.name} • {selectedRequest.total_days} day(s)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedRequest.start_date), 'MMM d')} - {format(new Date(selectedRequest.end_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {actionType === 'reject' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rejection Reason *</label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    className="min-h-[100px]"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
              className={actionType === 'approve' ? 'bg-success hover:bg-success/90' : ''}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
