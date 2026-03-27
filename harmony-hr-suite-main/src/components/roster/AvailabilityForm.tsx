import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Availability {
    id?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AvailabilityForm() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [employeeId, setEmployeeId] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchAvailability();
        }
    }, [user]);

    const fetchAvailability = async () => {
        try {
            // 1. Get Employee ID
            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('id')
                .eq('user_id', user?.id) // Assuming user_id is linked, or fallback to email matching if needed in real app
                .maybeSingle();

            // Fallback for demo: just grab the first employee if no auth link, 
            // OR in this specific codebase, we might need a better way to link auth user to employee.
            // For now, let's assume valid link or simulate one for the logged in "admin"
            let eId = empData?.id;

            if (!eId) {
            // Try to find employee by user id
            const { data: empData } = await supabase
                .from('employees')
                .select('id')
                .eq('user_id', user?.id)
                .maybeSingle();
                eId = empData?.id;
            }

            if (!eId) {
                // Stop if we can't identify the employee
                setLoading(false);
                return;
            }

            setEmployeeId(eId);

            // 2. Fetch Availability
            const { data, error } = await (supabase as any)
                .from('employee_availability')
                .select('*')
                .eq('employee_id', eId)
                .order('day_of_week');

            if (error) throw error;

            // Initialize missing days
            const fullWeek: Availability[] = [];
            for (let i = 0; i < 7; i++) {
                const found = data?.find(d => d.day_of_week === i);
                if (found) {
                    fullWeek.push(found);
                } else {
                    fullWeek.push({
                        day_of_week: i,
                        start_time: '09:00',
                        end_time: '17:00',
                        is_available: true // Default to available
                    });
                }
            }
            setAvailability(fullWeek);

        } catch (error) {
            console.error(error);
            toast({ title: 'Connection Error', description: 'Unable to load availability data. Please try again later.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!employeeId) return;
        setSaving(true);
        try {
            const upsertData = availability.map(a => ({
                employee_id: employeeId,
                day_of_week: a.day_of_week,
                start_time: a.start_time,
                end_time: a.end_time,
                is_available: a.is_available,
                ...(a.id ? { id: a.id } : {}) // Include ID if it exists for update
            }));

            const { error } = await (supabase as any)
                .from('employee_availability')
                .upsert(upsertData, { onConflict: 'employee_id,day_of_week' });

            if (error) throw error;

            toast({ title: 'Availability Saved', description: 'Your preferences have been updated.' });
            fetchAvailability(); // Refresh IDs
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to save availability', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const updateDay = (index: number, field: keyof Availability, value: any) => {
        const newAvail = [...availability];
        newAvail[index] = { ...newAvail[index], [field]: value };
        setAvailability(newAvail);
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!employeeId) return <div className="p-8 text-center text-muted-foreground">Employee profile not found. Please contact HR.</div>;

    return (
        <Card className="glass-card max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>My Weekly Availability</CardTitle>
                <CardDescription>Set your preferred working hours for standard weeks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    {availability.map((day, index) => (
                        <div key={day.day_of_week} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border border-border/50 bg-card/50">
                            <div className="flex items-center gap-4 w-32">
                                <Switch
                                    checked={day.is_available}
                                    onCheckedChange={(c) => updateDay(index, 'is_available', c)}
                                />
                                <Label className={`font-medium ${!day.is_available ? 'text-muted-foreground' : ''}`}>
                                    {DAYS[day.day_of_week]}
                                </Label>
                            </div>

                            {day.is_available ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="time"
                                            value={day.start_time.slice(0, 5)}
                                            onChange={(e) => updateDay(index, 'start_time', e.target.value)}
                                            className="w-24 bg-background"
                                        />
                                        <span className="text-muted-foreground">-</span>
                                        <Input
                                            type="time"
                                            value={day.end_time.slice(0, 5)}
                                            onChange={(e) => updateDay(index, 'end_time', e.target.value)}
                                            className="w-24 bg-background"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 text-sm text-muted-foreground italic">
                                    Not Available
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <Separator />

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Availability
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
