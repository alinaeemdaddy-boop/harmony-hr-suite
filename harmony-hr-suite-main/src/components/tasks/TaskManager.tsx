import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    Plus,
    Calendar,
    User,
    Filter,
    Search,
    MoreVertical,
    Edit2,
    Trash2,
    ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface GeneralTask {
    id: string;
    title: string;
    description: string | null;
    status: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: string | null;
    assigned_to: string;
    assigned_employee?: {
        full_name: string;
        avatar_url: string | null;
    };
    created_at: string;
}

interface Employee {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

export function TaskManager() {
    const { role, user } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<GeneralTask[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const isAdmin = role === 'super_admin' || role === 'hr_admin';

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium' as const,
        due_date: format(new Date(), 'yyyy-MM-dd'),
    });

    useEffect(() => {
        fetchTasks();
        if (isAdmin) {
            fetchEmployees();
        }
    }, [isAdmin]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            let query = (supabase as any)
                .from('general_tasks')
                .select(`
            *,
            assigned_employee:employees(full_name, avatar_url)
        `)
                .order('created_at', { ascending: false });

            if (!isAdmin) {
                // Employees only see tasks assigned to them
                query = query.eq('assigned_to', user?.employee_id);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTasks(data || []);
        } catch (error: any) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        const { data, error } = await supabase
            .from('employees')
            .select('id, full_name, avatar_url')
            .eq('status', 'active');

        if (!error) setEmployees(data || []);
    };

    const handleCreateTask = async () => {
        if (!formData.title || !formData.assigned_to) {
            toast({ title: 'Validation Error', description: 'Please fill in required fields', variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from('general_tasks').insert({
                title: formData.title,
                description: formData.description,
                assigned_to: formData.assigned_to,
                priority: formData.priority,
                due_date: formData.due_date,
                created_by: user?.id,
                status: 'todo'
            });

            if (error) throw error;

            toast({ title: 'Success', description: 'Task created and assigned successfully' });
            setIsDialogOpen(false);
            setFormData({
                title: '',
                description: '',
                assigned_to: '',
                priority: 'medium',
                due_date: format(new Date(), 'yyyy-MM-dd'),
            });
            fetchTasks();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const updateTaskStatus = async (taskId: string, newStatus: GeneralTask['status']) => {
        try {
            const { error } = await supabase
                .from('general_tasks')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', taskId);

            if (error) throw error;
            fetchTasks();
            toast({ title: 'Status Updated', description: `Task moved to ${newStatus}` });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const statusIcons = {
        todo: <Circle className="w-4 h-4 text-muted-foreground" />,
        in_progress: <Clock className="w-4 h-4 text-blue-500" />,
        completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        blocked: <AlertCircle className="w-4 h-4 text-red-500" />,
        cancelled: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
    };

    const priorityColors = {
        low: 'bg-slate-100 text-slate-700 border-slate-200',
        medium: 'bg-blue-100 text-blue-700 border-blue-200',
        high: 'bg-orange-100 text-orange-700 border-orange-200',
        urgent: 'bg-red-100 text-red-700 border-red-200 animate-pulse',
    };

    const filteredTasks = tasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display">Task Management</h1>
                    <p className="text-muted-foreground text-sm">Assign and track operational tasks</p>
                </div>

<TaskCreator employees={employees} onTaskCreated={fetchTasks} />
                        <DialogContent className="sm:max-w-[425px] glass-card">
                            <DialogHeader>
                                <DialogTitle>Create Task</DialogTitle>
                                <DialogDescription>Assign a new operational task to an employee</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Task Title*</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Steralize Surgery Room 3"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="desc">Description</Label>
                                    <Textarea
                                        id="desc"
                                        placeholder="Detailed instructions..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="assign">Assign To*</Label>
                                    <select
                                        id="assign"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.assigned_to}
                                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <select
                                            id="priority"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="due">Due Date</Label>
                                        <Input
                                            id="due"
                                            type="date"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreateTask} disabled={saving}>{saving ? 'Assigning...' : 'Assign Task'}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card className="glass-card border-0">
                <CardHeader className="p-4 border-b">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks..."
                                className="pl-9 bg-muted/20 border-0"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-12"><Clock className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <Clock className="w-12 h-12 mx-auto mb-4" />
                            <p>No tasks found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b">
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.map(task => (
                                    <TableRow key={task.id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <button
                                                onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'todo' : 'completed')}
                                                className="transition-transform active:scale-95"
                                            >
                                                {task.status === 'completed' ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                                                )}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "font-medium group-hover:text-primary transition-colors",
                                                    task.status === 'completed' && "line-through text-muted-foreground"
                                                )}>
                                                    {task.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground line-clamp-1">{task.description}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={task.assigned_employee?.avatar_url || ''} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {task.assigned_employee?.full_name?.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{task.assigned_employee?.full_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No date'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-1.5 h-5", priorityColors[task.priority])}>
                                                {task.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/5">
                                                        {statusIcons[task.status]}
                                                        <span className="capitalize">{task.status.replace('_', ' ')}</span>
                                                        <ChevronDown className="w-3 h-3 opacity-50" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="glass-card">
                                                    <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'todo')}>
                                                        <Circle className="w-4 h-4 mr-2" /> Todo
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'in_progress')}>
                                                        <Clock className="w-4 h-4 mr-2" /> In Progress
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'completed')}>
                                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Completed
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'blocked')}>
                                                        <AlertCircle className="w-4 h-4 mr-2 text-red-500" /> Blocked
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isAdmin ? (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="glass-card">
                                                        <DropdownMenuItem>
                                                            <Edit2 className="w-4 h-4 mr-2" /> Edit Task
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-500 hover:text-red-600">
                                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => updateTaskStatus(task.id, 'completed')}>
                                                    Resolve
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
