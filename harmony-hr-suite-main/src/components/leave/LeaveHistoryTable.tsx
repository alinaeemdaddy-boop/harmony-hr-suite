import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  Filter,
  Download,
  Eye,
  X,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { workflowTriggers } from '@/lib/workflow-triggers';
import { Building } from 'lucide-react';

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  total_days: number | null;
  half_day: boolean;
  half_day_type: string | null;
  created_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  document_url: string | null;
  leave_type: {
    name: string;
    is_paid: boolean;
  } | null;
  employee?: {
    full_name: string;
    branch_id?: string;
  } | null;
}

interface LeaveHistoryTableProps {
  employeeId?: string;
  showAllEmployees?: boolean;
  onRefresh?: () => void;
}

export function LeaveHistoryTable({ employeeId, showAllEmployees = false, onRefresh }: LeaveHistoryTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [branches, setBranches] = useState<{ id: string, name: string }[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLeaveHistory();
    fetchLeaveTypes();
    fetchBranches();
  }, [employeeId, showAllEmployees]);

  useEffect(() => {
    if (selectedRequest) {
      fetchAuditLogs(selectedRequest.id);
    } else {
      setAuditLogs([]);
    }
  }, [selectedRequest]);

  const fetchAuditLogs = async (requestId: string) => {
    const { data, error } = await (supabase as any)
      .from('leave_audit_logs')
      .select('*')
      .eq('leave_request_id', requestId)
      .order('performed_at', { ascending: false }); // Newest first
    
    if (!error && data) {
       setAuditLogs(data);
    }
  };

  const fetchBranches = async () => {
    const { data } = await (supabase as any).from('branches').select('id, name');
    setBranches(data || []);
  };

  const fetchLeaveTypes = async () => {
    const { data } = await supabase.from('leave_types').select('id, name').order('name');
    setLeaveTypes(data || []);
  };

  const fetchLeaveHistory = async () => {
    setLoading(true);

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        leave_type:leave_types(name, is_paid),
        employee:employees(full_name)
      `)
      .order('created_at', { ascending: false });

    if (!showAllEmployees && employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leave history:', error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; label: string; icon: React.ElementType }> = {
      draft: {
        color: 'bg-muted text-muted-foreground border-border',
        label: 'Draft',
        icon: FileText
      },
      pending: {
        color: 'bg-warning/10 text-warning border-warning/30',
        label: 'Pending',
        icon: Clock
      },
      approved: {
        color: 'bg-success/10 text-success border-success/30',
        label: 'Approved',
        icon: CheckCircle2
      },
      rejected: {
        color: 'bg-destructive/10 text-destructive border-destructive/30',
        label: 'Rejected',
        icon: XCircle
      },
      cancelled: {
        color: 'bg-muted text-muted-foreground border-border',
        label: 'Cancelled',
        icon: X
      },
    };
    return configs[status] || configs.pending;
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.leave_type?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.leave_type?.name === typeFilter;
    const matchesBranch = branchFilter === 'all' || request.employee?.branch_id === branchFilter;

    return matchesSearch && matchesStatus && matchesType && (showAllEmployees ? matchesBranch : true);
  });

  const handleCancelRequest = async (request: LeaveRequest) => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', request.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel leave request',
        variant: 'destructive',
      });
    } else {
      // Create audit log
      const { error: auditError } = await (supabase as any).from('leave_audit_logs').insert({
        leave_request_id: request.id,
        action: 'cancelled',
        performed_by: user?.id,
        performed_by_name: user?.full_name,
        details: null
      });
      if (auditError) console.error('Error creating audit log:', auditError);

      toast({
        title: 'Request Cancelled',
        description: 'Your leave request has been cancelled successfully',
      });
      workflowTriggers.leaveRequestCancelled(user?.id || '', {
        leave_request_id: request.id,
        employee_id: employeeId || null,
        leave_type: request.leave_type?.name,
        start_date: request.start_date,
        end_date: request.end_date,
        total_days: request.total_days,
      });
      fetchLeaveHistory();
      onRefresh?.();
    }
  };

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <History className="w-5 h-5 text-primary" />
            </div>
            Leave History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-muted/50 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span>Leave History</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[180px] h-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {leaveTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showAllEmployees && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <Building className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No Leave Requests Found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Submit your first leave request to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const statusConfig = getStatusConfig(request.status || 'pending');
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={request.id}
                  className={cn(
                    'p-4 rounded-xl border bg-card transition-all hover:shadow-md',
                    request.status === 'pending' && 'border-warning/30 bg-warning/5'
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      request.status === 'draft' && 'bg-muted',
                      request.status === 'approved' && 'bg-success/10',
                      request.status === 'pending' && 'bg-warning/10',
                      request.status === 'rejected' && 'bg-destructive/10',
                      request.status === 'cancelled' && 'bg-muted'
                    )}>
                      <StatusIcon className={cn(
                        'w-5 h-5',
                        request.status === 'draft' && 'text-muted-foreground',
                        request.status === 'approved' && 'text-success',
                        request.status === 'pending' && 'text-warning',
                        request.status === 'rejected' && 'text-destructive',
                        request.status === 'cancelled' && 'text-muted-foreground'
                      )} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{request.leave_type?.name || 'Leave'}</h4>
                          <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                            {statusConfig.label}
                          </Badge>
                          {request.half_day && (
                            <Badge variant="outline" className="text-xs">
                              {request.half_day_type === 'first_half' ? '🌅 AM' : '🌇 PM'}
                            </Badge>
                          )}
                          {!request.leave_type?.is_paid && (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                              Unpaid
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(request.start_date), 'MMM d')}
                            {request.start_date !== request.end_date && (
                              <> - {format(new Date(request.end_date), 'MMM d, yyyy')}</>
                            )}
                            {request.start_date === request.end_date && (
                              <>, {format(new Date(request.start_date), 'yyyy')}</>
                            )}
                          </span>
                          <span className="font-medium text-foreground">
                            {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                        {showAllEmployees && request.employee && (
                          <p className="text-xs text-muted-foreground mt-1">
                            By: {request.employee.full_name}
                          </p>
                        )}
                        {request.reason && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                            {request.reason}
                          </p>
                        )}
                        {request.rejection_reason && (
                          <p className="text-sm text-destructive mt-2 flex items-start gap-1">
                            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {request.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-10 md:ml-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        className="gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">Details</span>
                      </Button>
                      {request.document_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-1.5"
                        >
                          <a href={request.document_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-4 h-4" />
                            <span className="hidden sm:inline">Document</span>
                          </a>
                        </Button>
                      )}
                      {(request.status === 'pending' || request.status === 'draft') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Leave Request?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this leave request? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Request</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelRequest(request)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Yes, Cancel Request
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <span>Applied: {format(new Date(request.created_at), 'MMM d, yyyy • h:mm a')}</span>
                    {request.approved_at && (
                      <span>
                        {request.status === 'approved' ? 'Approved' : 'Reviewed'}: {format(new Date(request.approved_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Complete information about this leave request.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className={cn(
                  'p-2 rounded-full',
                  selectedRequest.status === 'approved' && 'bg-success/10 text-success',
                  selectedRequest.status === 'rejected' && 'bg-destructive/10 text-destructive',
                  selectedRequest.status === 'pending' && 'bg-warning/10 text-warning',
                  selectedRequest.status === 'cancelled' && 'bg-muted text-muted-foreground',
                )}>
                  {selectedRequest.status === 'approved' && <CheckCircle2 className="w-5 h-5" />}
                  {selectedRequest.status === 'rejected' && <XCircle className="w-5 h-5" />}
                  {selectedRequest.status === 'pending' && <Clock className="w-5 h-5" />}
                  {selectedRequest.status === 'cancelled' && <X className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium capitalize">{selectedRequest.status}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.leave_type?.name} • {selectedRequest.total_days} day(s)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Start Date</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(selectedRequest.start_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">End Date</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(selectedRequest.end_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-1 text-sm">Reason</p>
                <div className="p-3 rounded-lg border bg-card text-sm">
                  {selectedRequest.reason || 'No reason provided.'}
                </div>
              </div>

              {selectedRequest.rejection_reason && (
                <div>
                  <p className="text-destructive mb-1 text-sm font-medium">Rejection Reason</p>
                  <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-sm text-destructive">
                    {selectedRequest.rejection_reason}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p>Applied on</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(selectedRequest.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {selectedRequest.approved_at && (
                  <div>
                    <p>{selectedRequest.status === 'approved' ? 'Approved on' : 'Reviewed on'}</p>
                    <p className="font-medium text-foreground">
                      {format(new Date(selectedRequest.approved_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {auditLogs.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="font-medium text-sm mb-2">Activity Log</p>
                  <div className="space-y-3 pl-1">
                    {auditLogs.map((log, index) => (
                      <div key={log.id} className="relative flex gap-3 pb-3 last:pb-0">
                        {/* Line connecting dots */}
                        {index !== auditLogs.length - 1 && (
                          <div className="absolute left-[5px] top-2 bottom-0 w-px bg-border" />
                        )}
                        
                        <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-primary/20 border border-primary/50 shrink-0 z-10" />
                        
                        <div className="text-sm">
                          <p className="font-medium capitalize leading-none mb-1">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.performed_by_name && <span className="font-medium text-foreground mr-1">{log.performed_by_name} •</span>}
                            {format(new Date(log.performed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                          {log.details?.reason && (
                            <div className="mt-1.5 p-2 rounded bg-muted/50 text-xs text-muted-foreground italic">
                              "{log.details.reason}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
