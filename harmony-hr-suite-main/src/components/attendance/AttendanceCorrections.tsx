import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  FileEdit, 
  Plus, 
  Check, 
  X,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface AttendanceCorrectionsProps {
  employeeId: string | null;
  isAdmin?: boolean;
}

interface CorrectionRequest {
  id: string;
  correction_type: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  employee?: {
    full_name: string;
    employee_code: string;
  };
}

export function AttendanceCorrections({ employeeId, isAdmin }: AttendanceCorrectionsProps) {
  const { user } = useAuth();
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    correction_type: 'missed_checkin',
    requested_check_in: '',
    requested_check_out: '',
    reason: '',
  });

  useEffect(() => {
    fetchCorrections();
  }, [employeeId, isAdmin]);

  const fetchCorrections = async () => {
    let query = supabase
      .from('attendance_corrections')
      .select(`
        *,
        employee:employees(full_name, employee_code)
      `)
      .order('created_at', { ascending: false });

    if (!isAdmin && employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching corrections:', error);
    } else {
      setCorrections(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId) {
      toast.error('No employee profile linked');
      return;
    }

    try {
      const { error } = await supabase
        .from('attendance_corrections')
        .insert({
          employee_id: employeeId,
          correction_type: formData.correction_type,
          requested_check_in: formData.requested_check_in || null,
          requested_check_out: formData.requested_check_out || null,
          reason: formData.reason,
          status: 'pending',
        });

      if (error) throw error;
      
      toast.success('Correction request submitted');
      setDialogOpen(false);
      setFormData({
        correction_type: 'missed_checkin',
        requested_check_in: '',
        requested_check_out: '',
        reason: '',
      });
      fetchCorrections();
    } catch (error) {
      console.error('Error submitting correction:', error);
      toast.error('Failed to submit correction request');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance_corrections')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Correction approved');
      fetchCorrections();
    } catch (error) {
      console.error('Error approving correction:', error);
      toast.error('Failed to approve correction');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('attendance_corrections')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Correction rejected');
      fetchCorrections();
    } catch (error) {
      console.error('Error rejecting correction:', error);
      toast.error('Failed to reject correction');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCorrectionTypeLabel = (type: string) => {
    switch (type) {
      case 'missed_checkin':
        return 'Missed Check-in';
      case 'missed_checkout':
        return 'Missed Check-out';
      case 'wrong_time':
        return 'Wrong Time Recorded';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-primary" />
            {isAdmin ? 'Correction Requests' : 'My Correction Requests'}
          </CardTitle>
          {!isAdmin && employeeId && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Request Correction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Attendance Correction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Correction Type</Label>
                    <Select 
                      value={formData.correction_type} 
                      onValueChange={(value) => setFormData({ ...formData, correction_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="missed_checkin">Missed Check-in</SelectItem>
                        <SelectItem value="missed_checkout">Missed Check-out</SelectItem>
                        <SelectItem value="wrong_time">Wrong Time Recorded</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(formData.correction_type === 'missed_checkin' || formData.correction_type === 'wrong_time') && (
                    <div className="space-y-2">
                      <Label htmlFor="check_in">Correct Check-in Time</Label>
                      <Input
                        id="check_in"
                        type="datetime-local"
                        value={formData.requested_check_in}
                        onChange={(e) => setFormData({ ...formData, requested_check_in: e.target.value })}
                      />
                    </div>
                  )}

                  {(formData.correction_type === 'missed_checkout' || formData.correction_type === 'wrong_time') && (
                    <div className="space-y-2">
                      <Label htmlFor="check_out">Correct Check-out Time</Label>
                      <Input
                        id="check_out"
                        type="datetime-local"
                        value={formData.requested_check_out}
                        onChange={(e) => setFormData({ ...formData, requested_check_out: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason *</Label>
                    <Textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Explain why you need this correction..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Submit Request
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : corrections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isAdmin ? 'No correction requests to review' : 'No correction requests submitted'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead>Employee</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Requested Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {corrections.map((correction) => (
                    <TableRow key={correction.id}>
                      {isAdmin && (
                        <TableCell>
                          <div className="font-medium">{correction.employee?.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {correction.employee?.employee_code}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline">
                          {getCorrectionTypeLabel(correction.correction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {correction.requested_check_in && (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3 text-emerald-500" />
                              In: {format(new Date(correction.requested_check_in), 'MMM d, hh:mm a')}
                            </div>
                          )}
                          {correction.requested_check_out && (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3 text-red-500" />
                              Out: {format(new Date(correction.requested_check_out), 'MMM d, hh:mm a')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate" title={correction.reason}>
                          {correction.reason}
                        </p>
                        {correction.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">
                            Rejected: {correction.rejection_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(correction.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(correction.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {correction.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-emerald-500 hover:text-emerald-600"
                                onClick={() => handleApprove(correction.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleReject(correction.id)}
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
    </div>
  );
}
