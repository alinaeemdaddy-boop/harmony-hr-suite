// Grievances List Page
// This page serves both employees (to view their own grievances) and admins/HR (to manage all grievances).

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreVertical, Eye, Edit, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Grievance {
    id: string;
    title: string;
    type: string;
    incident_date: string;
    description: string;
    category: string;
    employee_id: string;
    department: string | null;
    urgency: string;
    status: string;
    assigned_hr_id: string | null;
    created_at: string;
    updated_at: string;
}

export default function Grievances() {
    const [grievances, setGrievances] = useState<Grievance[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [urgencyFilter, setUrgencyFilter] = useState('all');
    const navigate = useNavigate();
    const { role, user } = useAuth();
    const { toast } = useToast();

    const isAdmin = role?.includes('hr_admin') || role?.includes('super_admin');

    const fetchGrievances = async () => {
        setLoading(true);
        try {
            let query = (supabase as any).from('grievances').select('*');
            if (!isAdmin && user?.id) {
                query = query.eq('employee_id', user.id);
            }
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            setGrievances((data || []) as Grievance[]);
        } catch (err: any) {
            console.error(err);
            toast({
                title: 'Error loading grievances',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGrievances();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = grievances.filter((g) => {
        const matchesSearch =
            g.title.toLowerCase().includes(search.toLowerCase()) ||
            g.description.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
        const matchesType = typeFilter === 'all' || g.type === typeFilter;
        const matchesUrgency = urgencyFilter === 'all' || g.urgency === urgencyFilter;
        return matchesSearch && matchesStatus && matchesType && matchesUrgency;
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this grievance?')) return;
        const { error } = await (supabase as any).from('grievances').delete().eq('id', id);
        if (error) {
            toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Grievance deleted' });
            fetchGrievances();
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Grievances</h1>
                        <p className="text-muted-foreground mt-1">Submit and manage workplace grievances</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => navigate('/grievances/new')}
                            className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Grievance
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="glass-card border-0">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search grievances..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 input-glass"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px] input-glass">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[160px] input-glass">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="Harassment">Harassment</SelectItem>
                                    <SelectItem value="Safety Issue">Safety Issue</SelectItem>
                                    <SelectItem value="Workload Issue">Workload Issue</SelectItem>
                                    <SelectItem value="Others">Others</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                                <SelectTrigger className="w-[140px] input-glass">
                                    <SelectValue placeholder="Urgency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* List */}
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading grievances...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No grievances found.</div>
                ) : (
                    <div className="grid gap-4">
                        {filtered.map((g) => (
                            <Card key={g.id} className="glass-card-hover border-0 group">
                                <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10 border-2 border-primary/20">
                                            <AvatarFallback>{g.title.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-semibold text-foreground">{g.title}</h3>
                                            <p className="text-sm text-muted-foreground">{g.type} • {g.category}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={`ml-auto ${g.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : g.status === 'Resolved' ? 'bg-green-100 text-green-800' : g.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : ''}`}> {g.status} </Badge>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm text-muted-foreground mb-2">{g.description.slice(0, 120)}{g.description.length > 120 && '...'}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>Urgency: {g.urgency}</span>
                                        <span>Submitted: {new Date(g.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => navigate(`/grievances/${g.id}`)}>
                                                    <Eye className="w-4 h-4 mr-2" /> View Details
                                                </DropdownMenuItem>
                                                {isAdmin && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => navigate(`/grievances/${g.id}/edit`)}>
                                                            <Edit className="w-4 h-4 mr-2" /> Resolve / Update
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDelete(g.id)} className="text-destructive">
                                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
