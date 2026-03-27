// Grievance Submission Form
// Allows employees to submit a new grievance.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Calendar } from '@/components/ui/calendar'; // assume a calendar component exists

export default function GrievanceForm() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [title, setTitle] = useState('');
    const [type, setType] = useState('Harassment');
    const [incidentDate, setIncidentDate] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Management');
    const [urgency, setUrgency] = useState('Low');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);
        const payload = {
            title,
            type,
            incident_date: incidentDate,
            description,
            category,
            employee_id: user.id,
            // department omitted due to type constraints
            urgency,
            status: 'Pending',
        };
        const { error } = await (supabase as any).from('grievances').insert([payload]);
        if (error) {
            toast({ title: 'Submit failed', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Grievance submitted' });
            navigate('/grievances');
        }
        setSubmitting(false);
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto py-8">
                <Card className="glass-card border-0">
                    <CardHeader>
                        <CardTitle className="text-2xl">Submit a Grievance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                placeholder="Grievance Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                            <Select value={type} onValueChange={setType} required>
                                <SelectTrigger className="input-glass">
                                    <SelectValue placeholder="Grievance Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Harassment">Harassment</SelectItem>
                                    <SelectItem value="Safety Issue">Safety Issue</SelectItem>
                                    <SelectItem value="Workload Issue">Workload Issue</SelectItem>
                                    <SelectItem value="Others">Others</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                value={incidentDate}
                                onChange={(e) => setIncidentDate(e.target.value)}
                                required
                            />
                            <Textarea
                                placeholder="Detailed description of the incident"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                required
                            />
                            <Select value={category} onValueChange={setCategory} required>
                                <SelectTrigger className="input-glass">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Management">Management</SelectItem>
                                    <SelectItem value="Peer">Peer</SelectItem>
                                    <SelectItem value="Policy">Policy</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={urgency} onValueChange={setUrgency} required>
                                <SelectTrigger className="input-glass">
                                    <SelectValue placeholder="Urgency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-primary to-accent">
                                {submitting ? 'Submitting...' : 'Submit Grievance'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
