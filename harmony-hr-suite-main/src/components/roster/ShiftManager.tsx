import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Clock, Trash2, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Shift {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    type: string;
    color: string;
}

const COLORS = [
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Green', value: 'bg-emerald-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Orange', value: 'bg-orange-500' },
    { name: 'Rose', value: 'bg-rose-500' },
    { name: 'Indigo', value: 'bg-indigo-500' },
];

export function ShiftManager() {
    const { toast } = useToast();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [color, setColor] = useState('bg-blue-500');

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .order('created_at');

            if (error) throw error;
            setShifts(data || []);
        } catch (error) {
            console.error('Error fetching shifts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Validation State
    const [errors, setErrors] = useState<{ name?: string; time?: string; color?: string }>({});

    useEffect(() => {
        validateForm();
    }, [name, startTime, endTime, color]);

    const validateForm = () => {
        const newErrors: { name?: string; time?: string; color?: string } = {};

        // Name validation
        if (!name.trim()) {
            newErrors.name = "Shift name is required";
        } else if (!/^[a-zA-Z0-9\s-]+$/.test(name)) {
            newErrors.name = "Shift name contains invalid characters";
        }

        // Time validation
        if (!startTime || !endTime) {
            newErrors.time = "Both start and end times are required";
        } else if (startTime >= endTime) {
            newErrors.time = "Start time must be earlier than end time";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateShift = async () => {
        if (!validateForm()) return;

        // Duplicate checks
        const nameExists = shifts.some(s => s.name.toLowerCase() === name.trim().toLowerCase());
        if (nameExists) {
            toast({ title: 'Validation Error', description: 'A shift with this name already exists', variant: 'destructive' });
            return;
        }

        try {
            const { error } = await supabase
                .from('shifts')
                .insert([{
                    name: name.trim(),
                    start_time: startTime,
                    end_time: endTime,
                    color,
                    type: 'fixed'
                }]);

            if (error) throw error;

            toast({ title: 'Success', description: 'Shift created successfully' });
            setIsOpen(false);
            resetForm();
            fetchShifts();
        } catch (error: any) {
            console.error('Error creating shift:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to create shift. Please try again.',
                variant: 'destructive'
            });
        }
    };

    const isValid = Object.keys(errors).length === 0 && name.trim().length > 0;

    // ... (rest of imports/methods matches original file until render)

    const handleDeleteShift = async (id: string) => {
        try {
            const { error } = await supabase
                .from('shifts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast({ title: 'Success', description: 'Shift deleted' });
            fetchShifts();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete shift', variant: 'destructive' });
        }
    };

    const resetForm = () => {
        setName('');
        setStartTime('09:00');
        setEndTime('17:00');
        setColor('bg-blue-500');
        setErrors({});
    };

    return (
        <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Shift Types</CardTitle>
                    <CardDescription>Define standard shifts available for rostering</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Shift
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Add New Shift Type</DialogTitle>
                            <DialogDescription>Create a reuseable shift template.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Shift Name</Label>
                                <Input
                                    placeholder="e.g. Morning Shift"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className={errors.name ? "border-destructive" : ""}
                                />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                        className={errors.time ? "border-destructive" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Input
                                        type="time"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        className={errors.time ? "border-destructive" : ""}
                                    />
                                </div>
                            </div>
                            {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}

                            <div className="space-y-2">
                                <Label>Color Code</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setColor(c.value)}
                                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${c.value} ${color === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                                            title={c.name}
                                            type="button"
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Preview Section */}
                            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Preview</h4>
                                <div className="flex items-center gap-3 p-3 rounded-md bg-background shadow-sm border border-border/50">
                                    <div className={`w-3 h-10 rounded-full ${color}`} />
                                    <div>
                                        <p className="font-medium text-sm">{name || 'New Shift'}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            <span>{startTime} - {endTime}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateShift} disabled={!isValid}>Create Shift</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Color</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shifts.map((shift) => (
                            <TableRow key={shift.id}>
                                <TableCell>
                                    <div className={`w-6 h-6 rounded-full ${shift.color || 'bg-gray-200'}`} />
                                </TableCell>
                                <TableCell className="font-medium">{shift.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {(() => {
                                        const start = new Date(`2000-01-01T${shift.start_time}`);
                                        const end = new Date(`2000-01-01T${shift.end_time}`);
                                        let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                        if (diff < 0) diff += 24; // Handle overnight shifts
                                        return `${diff.toFixed(1)} hrs`;
                                    })()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteShift(shift.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
