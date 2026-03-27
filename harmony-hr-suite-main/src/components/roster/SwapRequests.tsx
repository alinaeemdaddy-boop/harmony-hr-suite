import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';

interface SwapRequestsProps {
    isAdmin: boolean;
}

interface SwapRequest {
    id: string;
    requester_id: string;
    target_employee_id: string | null;
    original_roster_entry_id: string;
    target_roster_entry_id: string | null;
    status: string;
    reason: string;
    created_at: string;

    requester: { full_name: string; avatar_url: string | null };
    target_employee?: { full_name: string; avatar_url: string | null };
    original_roster_entry: { date: string; shift: { name: string; start_time: string; end_time: string } };
    target_roster_entry?: { date: string; shift: { name: string; start_time: string; end_time: string } };
}

export function SwapRequests({ isAdmin }: SwapRequestsProps) {
    const { toast } = useToast();
    const [requests, setRequests] = useState<SwapRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('shift_swap_requests')
                .select(`
          *,
          requester:employees!requester_id(full_name, avatar_url),
          target_employee:employees!target_employee_id(full_name, avatar_url),
          original_roster_entry:roster_entries!original_roster_entry_id(
            date,
            shift:shifts(name, start_time, end_time)
          ),
          target_roster_entry:roster_entries!target_roster_entry_id(
            date,
            shift:shifts(name, start_time, end_time)
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data as any || []);
        } catch (error) {
            console.error('Error fetching swap requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (req: SwapRequest) => {
        try {
            // 1. Update status
            const { error: statusError } = await (supabase as any)
                .from('shift_swap_requests')
                .update({ status: 'approved' })
                .eq('id', req.id);

            if (statusError) throw statusError;

            // 2. Perform the actual roster swap/assignment
            if (req.target_roster_entry_id && req.target_employee_id) {
                // Two-way swap
                // Requester takes Target's shift
                const { error: update1 } = await (supabase as any)
                    .from('roster_entries')
                    .update({ employee_id: req.requester_id })
                    .eq('id', req.target_roster_entry_id);

                // Target takes Requester's shift
                const { error: update2 } = await (supabase as any)
                    .from('roster_entries')
                    .update({ employee_id: req.target_employee_id })
                    .eq('id', req.original_roster_entry_id);

                if (update1 || update2) throw new Error("Failed to swap assignments");

            } else if (req.target_employee_id) {
                // One-way reassignment (Give away)
                const { error: update } = await (supabase as any)
                    .from('roster_entries')
                    .update({ employee_id: req.target_employee_id })
                    .eq('id', req.original_roster_entry_id);

                if (update) throw update;
            }

            toast({ title: 'Request Approved', description: 'Roster updated successfully.' });
            fetchRequests();

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to process approval', variant: 'destructive' });
        }
    }

    const handleReject = async (id: string) => {
        try {
            const { error } = await (supabase as any)
                .from('shift_swap_requests')
                .update({ status: 'rejected' })
                .eq('id', id);

            if (error) throw error;
            toast({ title: 'Request Rejected', description: 'Swap request has been rejected.' });
            fetchRequests();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update request', variant: 'destructive' });
        }
    };

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle>Shift Swap Requests</CardTitle>
                <CardDescription>Manage requests from employees to swap their shifts</CardDescription>
            </CardHeader>
            <CardContent>
                {requests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No pending swap requests found.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map((req) => (
                            <div key={req.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50 gap-4">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="flex items-center -space-x-2 flex-shrink-0">
                                        <Avatar className="h-10 w-10 border-2 border-background">
                                            <AvatarImage src={req.requester.avatar_url || ''} />
                                            <AvatarFallback>{req.requester.full_name.substring(0, 1)}</AvatarFallback>
                                        </Avatar>
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border-2 border-background z-10 text-muted-foreground">
                                            <ArrowLeftRight className="w-4 h-4" />
                                        </div>
                                        {req.target_employee ? (
                                            <Avatar className="h-10 w-10 border-2 border-background z-20">
                                                <AvatarImage src={req.target_employee.avatar_url || ''} />
                                                <AvatarFallback>{req.target_employee.full_name?.substring(0, 1) || '?'}</AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border-2 border-background z-20 text-xs text-muted-foreground font-medium">
                                                Any
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                            <h4 className="font-medium text-sm truncate">
                                                {req.requester.full_name}
                                            </h4>
                                            <span className="text-muted-foreground text-xs hidden sm:inline">requested swap with</span>
                                            <h4 className="font-medium text-sm truncate">
                                                {req.target_employee?.full_name || 'anyone'}
                                            </h4>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                                                <span className="font-medium">Shift 1:</span>
                                                <span>{format(new Date(req.original_roster_entry.date), 'MMM d')} - {req.original_roster_entry.shift.name}</span>
                                            </div>

                                            {req.target_roster_entry && (
                                                <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                                                    <span className="font-medium">Shift 2:</span>
                                                    <span>{format(new Date(req.target_roster_entry.date), 'MMM d')} - {req.target_roster_entry.shift.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {req.reason && (
                                            <p className="mt-2 text-sm text-foreground/80 italic line-clamp-1">"{req.reason}"</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end">
                                    {req.status === 'pending' ? (
                                        isAdmin ? (
                                            <>
                                                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => handleReject(req.id)}>
                                                    Reject
                                                </Button>
                                                <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => handleApprove(req)}>
                                                    Approve
                                                </Button>
                                            </>
                                        ) : (
                                            <Badge variant="secondary">Pending Approval</Badge>
                                        )
                                    ) : (
                                        <Badge variant={req.status === 'approved' ? 'default' : 'destructive'} className={req.status === 'approved' ? 'bg-success hover:bg-success' : ''}>
                                            {req.status.toUpperCase()}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
