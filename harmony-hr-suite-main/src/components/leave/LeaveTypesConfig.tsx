
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  Settings,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Define schema for leave type form
const leaveTypeSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().optional(),
  days_per_year: z.coerce.number().min(0, { message: 'Days per year must be positive.' }),
  is_paid: z.boolean().default(true),
  requires_document: z.boolean().default(false),
  allows_carryover: z.boolean().default(false),
  max_carryover_days: z.coerce.number().min(0).optional(),
  min_days_notice: z.coerce.number().min(0).optional(),
  max_consecutive_days: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
});

type LeaveTypeFormValues = z.infer<typeof leaveTypeSchema>;

interface LeaveType extends LeaveTypeFormValues {
  id: string;
  created_at: string;
}

export function LeaveTypesConfig() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<LeaveTypeFormValues>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      days_per_year: 0,
      is_paid: true,
      requires_document: false,
      allows_carryover: false,
      max_carryover_days: 0,
      min_days_notice: 0,
      max_consecutive_days: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');

      if (error) throw error;

      setLeaveTypes(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch leave types: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (leaveType: LeaveType) => {
    setEditingId(leaveType.id);
    form.reset({
      name: leaveType.name,
      description: leaveType.description || '',
      days_per_year: leaveType.days_per_year || 0,
      is_paid: leaveType.is_paid || false,
      requires_document: leaveType.requires_document || false,
      allows_carryover: leaveType.allows_carryover || false,
      max_carryover_days: leaveType.max_carryover_days || 0,
      min_days_notice: leaveType.min_days_notice || 0,
      max_consecutive_days: leaveType.max_consecutive_days || 0,
      is_active: leaveType.is_active || false,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    form.reset({
      name: '',
      description: '',
      days_per_year: 0,
      is_paid: true,
      requires_document: false,
      allows_carryover: false,
      max_carryover_days: 0,
      min_days_notice: 0,
      max_consecutive_days: 0,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: LeaveTypeFormValues) => {
    try {
      const { error } = editingId
        ? await supabase
            .from('leave_types')
            .update(values)
            .eq('id', editingId)
        : await supabase
            .from('leave_types')
            .insert([values as any]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Leave type ${editingId ? 'updated' : 'created'} successfully.`,
      });

      setIsDialogOpen(false);
      fetchLeaveTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save leave type: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('leave_types')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      // Optimistic update
      setLeaveTypes(prev => 
        prev.map(lt => lt.id === id ? { ...lt, is_active: !currentState } : lt)
      );

      toast({
        title: 'Success',
        description: `Leave type ${!currentState ? 'activated' : 'deactivated'}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update status: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Leave Types Configuration
          </CardTitle>
          <CardDescription>
            Manage the types of leave available to employees and their policies.
          </CardDescription>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Leave Type
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Entitlement</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Carryover</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No leave types found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">
                        <div>{type.name}</div>
                        {type.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {type.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{type.days_per_year} days/year</TableCell>
                      <TableCell>
                        {type.is_paid ? (
                          <Badge variant="secondary" className="bg-success/10 text-success hover:bg-success/20">Paid</Badge>
                        ) : (
                          <Badge variant="outline">Unpaid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {type.allows_carryover ? (
                          <div className="text-sm">
                            <span className="text-success">Yes</span>
                            <span className="text-muted-foreground text-xs ml-1">
                              (Max {type.max_carryover_days})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {type.requires_document ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={type.is_active} 
                          onCheckedChange={() => toggleActive(type.id, !!type.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(type)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Leave Type' : 'Create Leave Type'}</DialogTitle>
            <DialogDescription>
              Configure the policies for this leave type.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Annual Leave" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="days_per_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Per Year</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormDescription>Total allowance per year</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief description of this leave type..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/20">
                  <FormField
                    control={form.control}
                    name="is_paid"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg p-2">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Paid Leave</FormLabel>
                          <FormDescription>
                            Is this leave type paid?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requires_document"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg p-2">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Document</FormLabel>
                          <FormDescription>
                            Proof required?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allows_carryover"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg p-2">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Allow Carryover</FormLabel>
                          <FormDescription>
                            Can unused days be carried over?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('allows_carryover') && (
                    <FormField
                      control={form.control}
                      name="max_carryover_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Carryover Days</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="min_days_notice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Notice (Days)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription>Required notice period</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_consecutive_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Consecutive Days</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription>Limit per single request</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? 'Update Leave Type' : 'Create Leave Type'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
