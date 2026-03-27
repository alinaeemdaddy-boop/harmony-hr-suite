import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MapPin, Phone, Mail, Building2, User, Clock, Users, Download, FileSpreadsheet, FileText, Bell, TrendingUp, DollarSign } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { exportToExcel, exportToPDF, ExportableEmployee } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Branch {
    id: string;
    name: string;
    city: string;
    area: string | null;
    branch_code: string;
    address: string | null;
    manager_id: string | null;
    contact_number: string | null;
    email: string | null;
    status: string | null; // Changed from 'active' | 'inactive' to match Supabase type
    operating_hours: string | null;
}

interface Employee {
    id: string;
    full_name: string;
    designation: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    salary?: number;
}

export default function BranchDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [branch, setBranch] = useState<Branch | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchBranchDetails();
        }
    }, [id]);

    const fetchBranchDetails = async () => {
        try {
            // Fetch Branch Info
            const { data: branchData, error: branchError } = await (supabase as any)
                .from('branches')
                .select('*')
                .eq('id', id)
                .single();

            if (branchError) throw branchError;
            setBranch(branchData as any);

            // Fetch Employees in Branch
            const { data: empData, error: empError } = await (supabase as any)
                .from('employees')
                .select('*')
                .eq('branch_id', id);

            if (empError) throw empError;
            setEmployees(empData || []);

        } catch (error) {
            console.error('Error fetching branch details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleExportBranch = async (type: 'pdf' | 'excel') => {
        if (!branch || employees.length === 0) {
            toast({
                title: "No Data",
                description: "No employees to export.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Fetch full employee details for export
            const { data: fullEmployees, error } = await (supabase as any)
                .from('employees')
                .select('*')
                .eq('branch_id', branch.id);

            if (error) throw error;

            const dataToExport: ExportableEmployee[] = fullEmployees.map((emp: any) => ({
                ...emp,
                department_name: 'N/A', // Could fetch dept name if needed, or join query
                branch_name: branch.name,
                salary: emp.salary, // Ensure fields match ExportableEmployee interface
            }));

            const filename = `${branch.name.replace(/\s+/g, '_')}_Employees`;

            if (type === 'excel') {
                exportToExcel(dataToExport, filename);
            } else if (type === 'pdf') {
                exportToPDF(dataToExport, filename);
            }

            toast({
                title: "Export Successful",
                description: `Branch report exported as ${type.toUpperCase()}`,
            });
        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: "Export Failed",
                description: "Failed to generate report",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!branch) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                    <Building2 className="w-12 h-12 mb-4 opacity-50" />
                    <p>Branch not found</p>
                    <Button variant="link" onClick={() => navigate('/branches')}>
                        Back to Branches
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/branches')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                            {branch.name}
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            {branch.branch_code} • {branch.city}
                        </p>
                    </div>
                    <Badge variant={branch.status === 'active' ? 'default' : 'secondary'} className="ml-auto">
                        {branch.status}
                    </Badge>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Download className="w-4 h-4" />
                                Export Report
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExportBranch('excel')}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Export as Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportBranch('pdf')}>
                                <FileText className="w-4 h-4 mr-2" />
                                Export as PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Location & Contact */}
                        <Card className="glass-card border-0">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-primary" />
                                    Branch Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-sm text-foreground">Address</h4>
                                                <p className="text-muted-foreground text-sm mt-1">
                                                    {branch.address || 'No address provided'}
                                                </p>
                                                <p className="text-muted-foreground text-sm">
                                                    {branch.city}, {branch.area}
                                                </p>
                                                {/* Embedded Map */}
                                                {branch.address && (
                                                    <div className="mt-4 rounded-lg overflow-hidden border border-border/50 shadow-sm">
                                                        <iframe
                                                            width="100%"
                                                            height="200"
                                                            src={`https://maps.google.com/maps?q=${encodeURIComponent(branch.address + ", " + branch.city)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                                            style={{ border: 0 }}
                                                            loading="lazy"
                                                            title="Branch Location"
                                                        ></iframe>
                                                        <div className="bg-muted/30 p-2 text-center">
                                                            <a
                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${branch.address}, ${branch.city}`)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
                                                            >
                                                                <MapPin className="w-3 h-3" />
                                                                Open in Google Maps
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-sm text-foreground">Contact</h4>
                                                <p className="text-muted-foreground text-sm mt-1">
                                                    {branch.contact_number || 'No phone number'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-sm text-foreground">Email</h4>
                                                <p className="text-muted-foreground text-sm mt-1">
                                                    {branch.email || 'No email address'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-sm text-foreground">Operating Hours</h4>
                                                <p className="text-muted-foreground text-sm mt-1">
                                                    {branch.operating_hours || '9:00 AM - 6:00 PM'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Employees List */}
                        <Card className="glass-card border-0">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    Assigned Employees ({employees.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {employees.length > 0 ? (
                                        employees.map(emp => (
                                            <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-border/50">
                                                        <AvatarImage src={emp.avatar_url || undefined} />
                                                        <AvatarFallback className="bg-primary/10 text-primary">
                                                            {getInitials(emp.full_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-sm text-foreground">{emp.full_name}</p>
                                                        <p className="text-xs text-muted-foreground">{emp.designation || 'No Designation'}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/employees/${emp.id}`)}
                                                    className="h-8 text-xs"
                                                >
                                                    View Profile
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>No employees assigned to this branch yet.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar / Stats (Placeholder for now, could add performance metrics later) */}
                    <div className="space-y-6">
                        <Card className="glass-card border-0 bg-primary/5">
                            <CardContent className="p-6">
                                <h3 className="font-semibold text-primary mb-2">Total Staff</h3>
                                <p className="text-4xl font-bold">{employees.length}</p>
                                <p className="text-sm text-muted-foreground mt-1">Active employees located at this branch.</p>
                            </CardContent>
                        </Card>

                        {/* Performance Metrics (Mocked for Demo) */}
                        <Card className="glass-card border-0">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-accent" />
                                    Performance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Attendance Rate</span>
                                        <span className="font-medium">94%</span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-success w-[94%]" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">On-Time Arrival</span>
                                        <span className="font-medium">88%</span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[88%]" />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Est. Monthly Payroll</span>
                                        <span className="font-bold text-lg flex items-center gap-1">
                                            <DollarSign className="w-4 h-4" />
                                            {(employees.reduce((acc, curr: any) => acc + (curr.salary || 0), 0) / 1000).toFixed(1)}k
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notifications / Announcements */}
                        <Card className="glass-card border-0">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-warning" />
                                    Announcements
                                </CardTitle>
                                <CardDescription>Send alerts to this branch</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full bg-gradient-to-r from-accent to-primary" onClick={() => toast({ title: "Feature Coming Soon", description: "This will allow broadcasting messages to all branch employees." })}>
                                    Send Notification
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
