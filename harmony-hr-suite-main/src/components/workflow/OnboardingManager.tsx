import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
    UserPlus,
    UserMinus,
    ClipboardCheck,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    FileSignature
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OnboardingCase {
    case_id: string;
    employee_id: string;
    status: 'pending' | 'active' | 'completed' | 'rejected' | 'no_show';
    start_date: string;
    employee: {
        full_name: string;
        employee_code: string;
        designation: string;
    };
}

interface OffboardingCase {
    case_id: string;
    employee_id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    notice_date: string;
    last_working_day: string;
    employee: {
        full_name: string;
        employee_code: string;
        designation: string;
    };
}

export function OnboardingManager() {
    const { toast } = useToast();
    const [onboardingCases, setOnboardingCases] = useState<OnboardingCase[]>([]);
    const [offboardingCases, setOffboardingCases] = useState<OffboardingCase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCases();
    }, []);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const { data: onData, error: onError } = await (supabase as any)
                .from('onboarding_cases')
                .select(`
                    *,
                    employee:employees(full_name, employee_code, designation)
                `)
                .order('created_at', { ascending: false });

            const { data: offData, error: offError } = await (supabase as any)
                .from('offboarding_cases')
                .select(`
                    *,
                    employee:employees(full_name, employee_code, designation)
                `)
                .order('created_at', { ascending: false });

            if (onError || offError) throw onError || offError;

            setOnboardingCases(onData as any || []);
            setOffboardingCases(offData as any || []);
        } catch (error: any) {
            console.error('Error fetching cases:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch onboarding/offboarding records',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
            case 'active':
            case 'in_progress': return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
            case 'pending': return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
            case 'rejected':
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Tabs defaultValue="onboarding" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="onboarding" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Onboarding Cases
                </TabsTrigger>
                <TabsTrigger value="offboarding" className="gap-2">
                    <UserMinus className="w-4 h-4" />
                    Offboarding Cases
                </TabsTrigger>
            </TabsList>

            <TabsContent value="onboarding">
                <Card className="glass-card border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardCheck className="w-6 h-6 text-primary" />
                            Employee Onboarding
                        </CardTitle>
                        <CardDescription>Track new hire integration and checklist completion</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8"><Clock className="w-6 h-6 animate-spin text-primary" /></div>
                        ) : onboardingCases.length === 0 ? (
                            <div className="text-center py-12 bg-muted/20 rounded-xl">
                                <UserPlus className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                                <p className="text-muted-foreground">No active onboarding cases found.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Designation</TableHead>
                                        <TableHead>Start Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {onboardingCases.map((c) => (
                                        <TableRow key={c.case_id}>
                                            <TableCell>
                                                <div className="font-medium">{c.employee?.full_name}</div>
                                                <div className="text-xs text-muted-foreground">{c.employee?.employee_code}</div>
                                            </TableCell>
                                            <TableCell>{c.employee?.designation}</TableCell>
                                            <TableCell>{format(new Date(c.start_date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{getStatusBadge(c.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="gap-2">
                                                    Manage Tasks
                                                    <ArrowRight className="w-3 h-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="offboarding">
                <Card className="glass-card border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSignature className="w-6 h-6 text-destructive" />
                            Employee Offboarding
                        </CardTitle>
                        <CardDescription>Manage resignation processes and final settlements</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8"><Clock className="w-6 h-6 animate-spin text-primary" /></div>
                        ) : offboardingCases.length === 0 ? (
                            <div className="text-center py-12 bg-muted/20 rounded-xl">
                                <UserMinus className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                                <p className="text-muted-foreground">No active offboarding cases found.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Notice Date</TableHead>
                                        <TableHead>Last Working Day</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {offboardingCases.map((c) => (
                                        <TableRow key={c.case_id}>
                                            <TableCell>
                                                <div className="font-medium">{c.employee?.full_name}</div>
                                                <div className="text-xs text-muted-foreground">{c.employee?.employee_code}</div>
                                            </TableCell>
                                            <TableCell>{format(new Date(c.notice_date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{format(new Date(c.last_working_day), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{getStatusBadge(c.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="gap-2">
                                                    Review Case
                                                    <ArrowRight className="w-3 h-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
