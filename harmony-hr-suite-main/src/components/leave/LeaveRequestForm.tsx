import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CalendarIcon,
  Send,
  Upload,
  AlertCircle,
  Info,
  X,
  FileText,
  CheckCircle2,
  Clock,
  Palmtree,
  Briefcase,
  Heart,
  Baby,
  Plane,
  GraduationCap,
  Calendar as CalendarDays,
  Loader2,
  ChevronRight,
  Sparkles,
  Save
} from 'lucide-react';
import { format, addDays, isWeekend, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { workflowTriggers } from '@/lib/workflow-triggers';
import { LeaveTypeDialog } from './LeaveTypeDialog';

interface LeaveType {
  id: string;
  name: string;
  days_per_year: number;
  description: string | null;
  is_paid: boolean;
  requires_document: boolean;
  min_days_notice: number;
  max_consecutive_days: number | null;
}

interface LeaveBalance {
  leave_type_id: string;
  total_days: number;
  used_days: number;
  pending_days: number;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

interface LeaveRequestFormProps {
  employeeId: string;
  onSuccess?: () => void;
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

export function LeaveRequestForm({ employeeId, onSuccess }: LeaveRequestFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
    reason: '',
    half_day: false,
    half_day_type: 'first_half' as 'first_half' | 'second_half',
  });

  useEffect(() => {
    fetchLeaveTypes();
    fetchHolidays();
    fetchLeaveBalances();
  }, [employeeId]);

  const fetchLeaveTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching leave types:', error);
    } else {
      setLeaveTypes(data || []);
    }
    setLoading(false);
  };

  const fetchLeaveBalances = async () => {
    const currentYear = new Date().getFullYear();

    const { data: balances } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', currentYear);

    const { data: pendingRequests } = await supabase
      .from('leave_requests')
      .select('leave_type_id, total_days')
      .eq('employee_id', employeeId)
      .eq('status', 'pending');

    const pendingByType: Record<string, number> = {};
    pendingRequests?.forEach(req => {
      if (req.leave_type_id) {
        pendingByType[req.leave_type_id] = (pendingByType[req.leave_type_id] || 0) + (req.total_days || 0);
      }
    });

    const formattedBalances: LeaveBalance[] = (balances || []).map(b => ({
      leave_type_id: b.leave_type_id,
      total_days: b.total_days,
      used_days: b.used_days,
      pending_days: pendingByType[b.leave_type_id] || 0,
    }));

    setLeaveBalances(formattedBalances);
  };

  const fetchHolidays = async () => {
    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('year', currentYear)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching holidays:', error);
    } else {
      setHolidays(data || []);
    }
  };

  const calculateLeaveDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;

    if (formData.half_day) return 0.5;

    let days = 0;
    let current = formData.start_date;

    while (current <= formData.end_date) {
      if (!isWeekend(current)) {
        const isHoliday = holidays.some(
          h => format(new Date(h.date), 'yyyy-MM-dd') === format(current, 'yyyy-MM-dd')
        );
        if (!isHoliday) {
          days++;
        }
      }
      current = addDays(current, 1);
    }

    return days;
  };

  const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leave_type_id);
  const totalDays = calculateLeaveDays();

  const selectedBalance = leaveBalances.find(b => b.leave_type_id === formData.leave_type_id);
  const availableDays = selectedBalance
    ? selectedBalance.total_days - selectedBalance.used_days - selectedBalance.pending_days
    : 0;

  const LeaveIcon = selectedLeaveType
    ? leaveTypeIcons[selectedLeaveType.name] || CalendarDays
    : CalendarDays;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please upload a file smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setUploadedFile(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
  };

  const uploadDocument = async (): Promise<string | null> => {
    if (!uploadedFile) return null;

    setUploading(true);
    const fileExt = uploadedFile.name.split('.').pop();
    const fileName = `${employeeId}/leave-docs/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('employee-documents')
      .upload(fileName, uploadedFile);

    setUploading(false);

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const submitRequest = async (status: 'pending' | 'draft') => {
    /*
    if (!formData.leave_type_id || !formData.start_date || !formData.end_date) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    */

    // Balance check removed for maximum flexibility
    /*
    if (totalDays > availableDays && availableDays > 0) { ... }
    */

    // Validations removed per user request for "No Validation" flexibility
    setSubmitting(true);

    let documentUrl = null;
    if (uploadedFile) {
      documentUrl = await uploadDocument();
    }

    const { data: newRequest, error } = await supabase.from('leave_requests').insert({
      employee_id: employeeId,
      leave_type_id: formData.leave_type_id,
      start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
      end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
      reason: formData.reason,
      half_day: formData.half_day,
      half_day_type: formData.half_day ? formData.half_day_type : null,
      total_days: totalDays,
      status: status,
      document_url: documentUrl,
    }).select().single();

    if (error) {
      console.error('Error submitting leave request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit leave request. Please try again.',
        variant: 'destructive',
      });
    } else {
      // Create audit log
      if (newRequest && user) {
        const { error: auditError } = await (supabase as any).from('leave_audit_logs').insert({
          leave_request_id: newRequest.id,
          action: status === 'draft' ? 'draft_created' : 'created',
          performed_by: user.id,
          performed_by_name: user.full_name,
          details: null
        });
        if (auditError) console.error('Error creating audit log:', auditError);
      }

      // Trigger workflow automation to notify manager
      if (status === 'pending') {
        if (user) {
          workflowTriggers.leaveRequestCreated(user.id, employeeId, {
            leave_type: selectedLeaveType?.name,
            start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
            end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
            total_days: totalDays,
            reason: formData.reason,
          });
        }
      }

      toast({
        title: status === 'draft' ? 'Draft Saved' : 'Leave Request Submitted',
        description: status === 'draft'
          ? 'Your request has been saved as a draft.'
          : 'Your request has been sent to your manager for approval.',
      });
      setFormData({
        leave_type_id: '',
        start_date: null,
        end_date: null,
        reason: '',
        half_day: false,
        half_day_type: 'first_half',
      });
      setUploadedFile(null);
      onSuccess?.();
    }

    setSubmitting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitRequest('pending');
  };

  const isHolidayDate = (date: Date) => {
    return holidays.some(
      h => format(new Date(h.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getBalanceColor = (available: number, total: number) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;
    if (percentage <= 20) return 'text-destructive';
    if (percentage <= 50) return 'text-warning';
    return 'text-success';
  };

  return (
    <Card className="overflow-hidden border-0 shadow-xl shadow-primary/5 bg-card">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="relative px-6 py-8 border-b border-border/50">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Apply for Leave
              </h2>
              <p className="text-sm text-muted-foreground">
                Submit your leave request for manager approval
              </p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Leave Type Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="form-label flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Select Leave Type
              </Label>
              <LeaveTypeDialog onSuccess={fetchLeaveTypes} />
            </div>
            <Select
              value={formData.leave_type_id}
              onValueChange={(v) => setFormData({ ...formData, leave_type_id: v })}
            >
              <SelectTrigger className="h-14 bg-muted/30 border-border/60 hover:border-primary/40 transition-colors text-base">
                <SelectValue placeholder="Choose your leave type..." />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {leaveTypes.map((lt) => {
                  const Icon = leaveTypeIcons[lt.name] || CalendarDays;
                  const balance = leaveBalances.find(b => b.leave_type_id === lt.id);
                  const available = balance ? balance.total_days - balance.used_days - balance.pending_days : lt.days_per_year || 0;

                  return (
                    <SelectItem key={lt.id} value={lt.id} className="py-3.5 cursor-pointer">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{lt.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'ml-auto font-semibold',
                            getBalanceColor(available, balance?.total_days || lt.days_per_year || 0)
                          )}
                        >
                          {available} days
                        </Badge>
                        {!lt.is_paid && (
                          <Badge className="bg-warning/15 text-warning border-0 text-xs">
                            Unpaid
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Selected Leave Type Details */}
            {selectedLeaveType && (
              <div className="form-section animate-fade-in space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <LeaveIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold text-foreground">{selectedLeaveType.name}</h4>
                      {!selectedLeaveType.is_paid && (
                        <Badge className="bg-warning/15 text-warning border-0 shrink-0">
                          Unpaid Leave
                        </Badge>
                      )}
                    </div>
                    {selectedLeaveType.description && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {selectedLeaveType.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Leave Balance Display */}
                {selectedBalance && (
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Your Balance</span>
                      <span className={cn('font-bold text-lg', getBalanceColor(availableDays, selectedBalance.total_days))}>
                        {availableDays} <span className="text-sm font-normal text-muted-foreground">/ {selectedBalance.total_days} days</span>
                      </span>
                    </div>
                    <Progress
                      value={(availableDays / selectedBalance.total_days) * 100}
                      className="h-2.5 bg-muted"
                    />
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        Used: {selectedBalance.used_days}
                      </span>
                      {selectedBalance.pending_days > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-warning" />
                          Pending: {selectedBalance.pending_days}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Policy Badges */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                  {selectedLeaveType.min_days_notice > 0 && (
                    <Badge variant="outline" className="text-xs py-1.5 px-3 bg-muted/50">
                      <AlertCircle className="w-3 h-3 mr-1.5" />
                      {selectedLeaveType.min_days_notice} days notice
                    </Badge>
                  )}
                  {selectedLeaveType.max_consecutive_days && (
                    <Badge variant="outline" className="text-xs py-1.5 px-3 bg-muted/50">
                      Max {selectedLeaveType.max_consecutive_days} days
                    </Badge>
                  )}
                  {selectedLeaveType.requires_document && (
                    <Badge className="text-xs py-1.5 px-3 bg-primary/10 text-primary border-0">
                      <FileText className="w-3 h-3 mr-1.5" />
                      Document required
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Half Day Toggle */}
          <div className="form-section flex items-center justify-between">
            <div className="space-y-1">
              <Label className="form-label">Half Day Leave</Label>
              <p className="text-sm text-muted-foreground">Request only half a working day</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Switch
                checked={formData.half_day}
                onCheckedChange={(v) => setFormData({ ...formData, half_day: v })}
                disabled={formData.start_date && formData.end_date && format(formData.start_date, 'yyyy-MM-dd') !== format(formData.end_date, 'yyyy-MM-dd')}
                className="data-[state=checked]:bg-primary"
              />
              {formData.start_date && formData.end_date && format(formData.start_date, 'yyyy-MM-dd') !== format(formData.end_date, 'yyyy-MM-dd') && (
                <span className="text-[10px] text-muted-foreground italic">Only for single day</span>
              )}
            </div>
          </div>

          {formData.half_day && (
            <div className="space-y-3 animate-fade-in">
              <Label className="form-label">Select Half</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className={cn(
                    'flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200',
                    formData.half_day_type === 'first_half'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/60 hover:border-primary/40 bg-muted/20'
                  )}
                  onClick={() => setFormData({ ...formData, half_day_type: 'first_half' })}
                >
                  <span className="text-2xl">🌅</span>
                  <span className="font-medium text-sm">First Half</span>
                  <span className="text-xs text-muted-foreground">Morning Session</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200',
                    formData.half_day_type === 'second_half'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/60 hover:border-primary/40 bg-muted/20'
                  )}
                  onClick={() => setFormData({ ...formData, half_day_type: 'second_half' })}
                >
                  <span className="text-2xl">🌇</span>
                  <span className="font-medium text-sm">Second Half</span>
                  <span className="text-xs text-muted-foreground">Afternoon Session</span>
                </button>
              </div>
            </div>
          )}

          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <Label className="form-label">Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-14 justify-start text-left font-normal border-border/60 bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition-all',
                      !formData.start_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                    {formData.start_date ? format(formData.start_date, 'PPP') : 'Select start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date || undefined}
                    onSelect={(date) => setFormData({
                      ...formData,
                      start_date: date || null,
                      end_date: formData.half_day ? date || null : formData.end_date
                    })}
                    disabled={(date) => false} // Restrictions removed per user request
                    className="pointer-events-auto rounded-xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="form-label">End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-14 justify-start text-left font-normal border-border/60 bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition-all',
                      !formData.end_date && 'text-muted-foreground'
                    )}
                    disabled={formData.half_day}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                    {formData.end_date ? format(formData.end_date, 'PPP') : 'Select end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date || undefined}
                    onSelect={(date) => setFormData({ ...formData, end_date: date || null })}
                    disabled={(date) => false} // Restrictions removed per user request
                    className="pointer-events-auto rounded-xl"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Duration Summary */}
          {formData.start_date && formData.end_date && (
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-accent/5 animate-fade-in">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/15">
                      <CalendarDays className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Leave Duration</p>
                      <p className="text-sm text-muted-foreground/80">
                        {format(formData.start_date, 'MMM d')} — {format(formData.end_date, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold text-primary">{totalDays}</span>
                    <span className="text-sm text-muted-foreground ml-1.5">
                      {totalDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-primary/10">
                  Excludes weekends and public holidays
                </p>
                {totalDays > availableDays && availableDays > 0 && (
                  <div className="flex items-center gap-2 mt-3 text-destructive text-sm font-medium">
                    <AlertCircle className="w-4 h-4" />
                    Exceeds available balance ({availableDays} days)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-3">
            <Label className="form-label">
              Reason for Leave {selectedLeaveType?.requires_document ? '*' : '(Optional)'}
            </Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="min-h-[120px] resize-none bg-muted/30 border-border/60 focus:border-primary/40 transition-colors"
              placeholder="Please provide a brief reason for your leave request..."
            />
          </div>

          {/* Document Upload */}
          <div className="space-y-3">
            <Label className="form-label">
              Supporting Document {selectedLeaveType?.requires_document ? '*' : '(Optional)'}
            </Label>

            {!uploadedFile ? (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border/60 rounded-2xl cursor-pointer bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all duration-200">
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="p-3 rounded-xl bg-primary/10 mb-3">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">PDF, JPG, PNG (max 5MB)</p>
                </div>
                <Input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl bg-success/10 border border-success/30 animate-fade-in">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-success/20">
                    <FileText className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {selectedLeaveType?.requires_document && (
              <p className="text-xs text-primary flex items-center gap-1.5 font-medium">
                <Info className="w-3.5 h-3.5" />
                {selectedLeaveType.name} requires supporting documentation
              </p>
            )}
          </div>

          {/* Approval Workflow */}
          <div className="form-section">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Info className="w-4 h-4 text-primary" />
              Approval Workflow
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <span className="text-sm font-medium">Submit</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center border border-warning/20">
                  <span className="text-xs font-bold text-warning">2</span>
                </div>
                <span className="text-sm font-medium">Review</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center border border-success/20">
                  <span className="text-xs font-bold text-success">3</span>
                </div>
                <span className="text-sm font-medium">Approved</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              className="h-14 text-base font-semibold border-border/60 hover:bg-muted/50 hover:border-primary/40 transition-all duration-300"
              disabled={submitting || !formData.leave_type_id}
              onClick={() => submitRequest('draft')}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Save as Draft
            </Button>

            <Button
              type="submit"
              className="h-14 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              disabled={submitting || !formData.leave_type_id || !formData.start_date || !formData.end_date}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
