
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw, Shield, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERMISSIONS = [
    { key: 'manage_users', label: 'User Management', category: 'Security' },
    { key: 'system_settings', label: 'Settings Configuration', category: 'Security' },
    { key: 'manage_employees', label: 'Manage Employees', category: 'HR Functions' },
    { key: 'manage_payroll', label: 'Manage Payroll', category: 'HR Functions' },
    { key: 'manage_leave', label: 'Manage Leave', category: 'HR Functions' },
    { key: 'manage_roster', label: 'Manage Roster', category: 'HR Functions' },
    { key: 'view_reports', label: 'Access Reports', category: 'Analytics' },
    { key: 'view_own_profile', label: 'View Own Profile', category: 'Self Service' },
    { key: 'request_leave', label: 'Request Leave', category: 'Self Service' },
    { key: 'mark_attendance', label: 'Mark Attendance', category: 'Self Service' },
];

const ROLES = [
    { key: 'super_admin', label: 'Super Admin', icon: Shield, color: 'text-primary' },
    { key: 'hr_admin', label: 'HR Manager', icon: Users, color: 'text-blue-600' },
    { key: 'employee', label: 'Employee', icon: User, color: 'text-slate-600' },
];

export function RolePermissionsMatrix() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [matrix, setMatrix] = useState<Record<string, string[]>>({
        super_admin: [],
        hr_admin: [],
        employee: [],
    });
    const { toast } = useToast();

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('app_permissions')
                .select('role, permission_key');

            if (error) throw error;

            const newMatrix: Record<string, string[]> = {
                super_admin: [],
                hr_admin: [],
                employee: [],
            };

            data?.forEach(item => {
                if (newMatrix[item.role]) {
                    newMatrix[item.role].push(item.permission_key);
                }
            });

            setMatrix(newMatrix);
        } catch (error: any) {
            console.error('Error fetching permissions:', error);
            // Table might not exist yet, we'll handle this gracefully
            if (error.code === '42P01') {
                toast({
                    title: 'Database Setup Required',
                    description: 'The app_permissions table does not exist. Please run the migration script.',
                    variant: 'destructive'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (role: string, permission: string) => {
        setMatrix(prev => {
            const current = [...prev[role]];
            if (current.includes(permission)) {
                return { ...prev, [role]: current.filter(p => p !== permission) };
            } else {
                return { ...prev, [role]: [...current, permission] };
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // First, delete all existing permissions to replace them
            // This is a simple approach for manual management
            const { error: deleteError } = await (supabase as any)
                .from('app_permissions')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (deleteError) throw deleteError;

            // Prepare batch insert
            const inserts = [];
            for (const role in matrix) {
                for (const permission of matrix[role]) {
                    inserts.push({ role, permission_key: permission });
                }
            }

            if (inserts.length > 0) {
                const { error: insertError } = await (supabase as any)
                    .from('app_permissions')
                    .insert(inserts);
                if (insertError) throw insertError;
            }

            toast({
                title: 'Permissions Saved',
                description: 'The role matrix has been updated successfully.'
            });

            // Note: In a real app, you might want to force a refresh of the auth state or use a provider
            window.dispatchEvent(new Event('permissions-updated'));

        } catch (error: any) {
            console.error('Error saving permissions:', error);
            toast({
                title: 'Save Failed',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground tracking-wide">Syncing Role Matrix...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Access Control Matrix</h3>
                    <p className="text-sm text-muted-foreground">Manual permission overriding for system roles</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchPermissions} disabled={saving}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50 shadow-sm backdrop-blur-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="w-[300px]">Permission Module</TableHead>
                            {ROLES.map(role => (
                                <TableHead key={role.key} className="text-center min-w-[120px]">
                                    <div className="flex flex-col items-center gap-1.5 py-2">
                                        <role.icon className={cn("w-5 h-5", role.color)} />
                                        <span className="text-xs font-display font-bold uppercase tracking-wider">{role.label}</span>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from(new Set(PERMISSIONS.map(p => p.category))).map(category => (
                            <div key={category} className="contents">
                                <TableRow className="bg-muted/20 hover:bg-muted/20">
                                    <TableCell colSpan={ROLES.length + 1} className="py-2 px-4 h-auto">
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-background/50 border-primary/20 text-primary">
                                            {category}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                                {PERMISSIONS.filter(p => p.category === category).map((permission) => (
                                    <TableRow key={permission.key} className="hover:bg-primary/5 transition-colors">
                                        <TableCell className="font-medium py-4">
                                            <div>
                                                <p className="text-sm text-foreground/90">{permission.label}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono italic">{permission.key}</p>
                                            </div>
                                        </TableCell>
                                        {ROLES.map(role => (
                                            <TableCell key={role.key} className="text-center py-4">
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        checked={matrix[role.key]?.includes(permission.key)}
                                                        onCheckedChange={() => togglePermission(role.key, permission.key)}
                                                        className="h-5 w-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-300 transform active:scale-90"
                                                    />
                                                </div>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </div>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex gap-3 text-blue-800 animate-in fade-in duration-500">
                <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                    <p className="font-bold">Security Notice:</p>
                    <p>Changes to the Role Matrix apply instantly to all active sessions once you save. Super Admin role always maintains core access to User Management and Settings for security purposes.</p>
                </div>
            </div>
        </div>
    );
}
