import { useState, useEffect } from 'react';
import { 
  Zap, Plus, Play, Pause, Trash2, Edit2, Settings, 
  Clock, Users, FileText, DollarSign, Calendar, 
  CheckCircle, AlertTriangle, Activity, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface WorkflowRule {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  trigger_conditions: unknown;
  action_type: string;
  action_config: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkflowLog {
  id: string;
  rule_id: string | null;
  trigger_event: string;
  action_taken: string;
  status: string;
  created_at: string;
}

const TRIGGER_EVENTS = [
  { value: 'leave_request_created', label: 'Leave Request Created', icon: Calendar, color: 'emerald' },
  { value: 'leave_request_approved', label: 'Leave Request Approved', icon: CheckCircle, color: 'green' },
  { value: 'leave_request_rejected', label: 'Leave Request Rejected', icon: AlertTriangle, color: 'red' },
  { value: 'attendance_late', label: 'Late Arrival Detected', icon: Clock, color: 'amber' },
  { value: 'attendance_absent', label: 'Absence Detected', icon: Users, color: 'red' },
  { value: 'payroll_processed', label: 'Payroll Processed', icon: DollarSign, color: 'blue' },
  { value: 'document_uploaded', label: 'Document Uploaded', icon: FileText, color: 'purple' },
  { value: 'employee_onboarded', label: 'New Employee Onboarded', icon: Users, color: 'cyan' },
];

const ACTION_TYPES = [
  { value: 'send_notification', label: 'Send In-App Notification' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'escalate_manager', label: 'Escalate to Manager' },
  { value: 'create_task', label: 'Create Follow-up Task' },
  { value: 'update_status', label: 'Update Status' },
  { value: 'schedule_reminder', label: 'Schedule Reminder' },
];

export function WorkflowAutomation() {
  const { toast } = useToast();
  const { role } = useAuth();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_event: '',
    action_type: '',
    action_message: '',
  });

  const isAdmin = role === 'super_admin' || role === 'hr_admin';

  useEffect(() => {
    fetchRules();
    fetchLogs();
  }, []);

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from('workflow_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRules(data);
    }
    setLoading(false);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('workflow_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data);
    }
  };

  const handleCreateRule = async () => {
    if (!formData.name || !formData.trigger_event || !formData.action_type) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const ruleData = {
      name: formData.name,
      description: formData.description || null,
      trigger_event: formData.trigger_event,
      action_type: formData.action_type,
      action_config: { message: formData.action_message },
      is_active: true,
    };

    const { error } = editingRule
      ? await supabase.from('workflow_rules').update(ruleData).eq('id', editingRule.id)
      : await supabase.from('workflow_rules').insert(ruleData);

    if (error) {
      toast({
        title: 'Error',
        description: `Failed to ${editingRule ? 'update' : 'create'} workflow rule.`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Workflow rule ${editingRule ? 'updated' : 'created'} successfully.`,
      });
      fetchRules();
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleToggleRule = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('workflow_rules')
      .update({ is_active: isActive })
      .eq('id', id);

    if (!error) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: isActive } : r));
      toast({
        title: isActive ? 'Rule Activated' : 'Rule Deactivated',
        description: `Workflow rule has been ${isActive ? 'enabled' : 'disabled'}.`,
      });
    }
  };

  const handleDeleteRule = async (id: string) => {
    const { error } = await supabase.from('workflow_rules').delete().eq('id', id);

    if (!error) {
      setRules(prev => prev.filter(r => r.id !== id));
      toast({
        title: 'Rule Deleted',
        description: 'Workflow rule has been removed.',
      });
    }
  };

  const openEditDialog = (rule: WorkflowRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      trigger_event: rule.trigger_event,
      action_type: rule.action_type,
      action_message: (rule.action_config as { message?: string }).message || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      trigger_event: '',
      action_type: '',
      action_message: '',
    });
  };

  const getTriggerInfo = (event: string) => {
    return TRIGGER_EVENTS.find(t => t.value === event);
  };

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Workflow Automation
          </h2>
          <p className="text-muted-foreground mt-1">
            Automate tasks, reminders, and escalations
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{rules.length}</p>
                <p className="text-sm text-muted-foreground">Total Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Play className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {rules.filter(r => r.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Pause className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {rules.filter(r => !r.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Paused Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{logs.length}</p>
                <p className="text-sm text-muted-foreground">Executions (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            Loading workflow rules...
          </div>
        ) : rules.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Workflow Rules Yet
              </h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                Create automation rules to streamline HR processes with automatic
                notifications, reminders, and escalations.
              </p>
              {isAdmin && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Rule
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => {
            const triggerInfo = getTriggerInfo(rule.trigger_event);
            const TriggerIcon = triggerInfo?.icon || Zap;

            return (
              <Card
                key={rule.id}
                className={`transition-all duration-200 ${
                  rule.is_active
                    ? 'border-primary/30 shadow-sm'
                    : 'border-muted opacity-70'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          rule.is_active ? 'bg-primary/10' : 'bg-muted'
                        }`}
                      >
                        <TriggerIcon
                          className={`h-5 w-5 ${
                            rule.is_active ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base">{rule.name}</CardTitle>
                        {rule.description && (
                          <CardDescription className="mt-1">
                            {rule.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      disabled={!isAdmin}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Badge
                      variant="secondary"
                      className={`${
                        triggerInfo?.color === 'emerald'
                          ? 'bg-emerald-100 text-emerald-700'
                          : triggerInfo?.color === 'amber'
                          ? 'bg-amber-100 text-amber-700'
                          : triggerInfo?.color === 'red'
                          ? 'bg-red-100 text-red-700'
                          : triggerInfo?.color === 'blue'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {triggerInfo?.label || rule.trigger_event}
                    </Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge variant="outline">{getActionLabel(rule.action_type)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated {format(new Date(rule.updated_at), 'MMM d, yyyy')}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Recent Activity */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Workflow Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-full ${
                        log.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-600'
                          : log.status === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {log.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : log.status === 'failed' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {log.action_taken}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Triggered by: {getTriggerInfo(log.trigger_event)?.label || log.trigger_event}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {editingRule ? 'Edit Workflow Rule' : 'Create Workflow Rule'}
            </DialogTitle>
            <DialogDescription>
              Set up automated actions based on HR events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Notify manager on leave request"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this rule do?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>When this happens (Trigger) *</Label>
              <Select
                value={formData.trigger_event}
                onValueChange={(value) => setFormData({ ...formData, trigger_event: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger event" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div className="flex items-center gap-2">
                        <trigger.icon className="h-4 w-4" />
                        {trigger.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Do this (Action) *</Label>
              <Select
                value={formData.action_type}
                onValueChange={(value) => setFormData({ ...formData, action_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(formData.action_type === 'send_notification' ||
              formData.action_type === 'send_email') && (
              <div className="space-y-2">
                <Label htmlFor="message">Message Template</Label>
                <Textarea
                  id="message"
                  placeholder="Enter the notification/email message..."
                  value={formData.action_message}
                  onChange={(e) =>
                    setFormData({ ...formData, action_message: e.target.value })
                  }
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{employee_name}}'}, {'{{date}}'}, etc. for dynamic values
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule} className="bg-primary hover:bg-primary/90">
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
