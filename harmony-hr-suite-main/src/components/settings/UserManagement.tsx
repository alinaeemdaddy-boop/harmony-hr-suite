
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, Key, Edit, ShieldCheck } from 'lucide-react';
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { hashPassword } from '@/lib/auth'; // Ensure this is using a client-side hash or remove if RPC handles it. 
// Note: In typical real-world, we send password plain over HTTPS and hash on server, or hash client side.
// Our admin_create_user expects a hash.

interface AppUser {
    id: string;
    username: string;
    full_name: string;
    role: string;
    is_active: boolean;
    last_login: string | null;
    assigned_modules: { id: string; key: string; name: string }[];
}

interface Module {
    id: string;
    name: string;
    key: string;
}

export function UserManagement() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [allModules, setAllModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const { toast } = useToast();

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        password: '',
        role: 'employee',
        is_active: true,
        selectedModules: [] as string[], // IDs
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // 1. Fetch Modules
        const { data: modData } = await (supabase as any).from('modules').select('*').order('name');
        setAllModules(modData as unknown as Module[] || []);

        // 2. Fetch Users via RPC
        const { data: userData, error } = await (supabase as any).rpc('get_admin_users_list');

        if (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
        } else {
            setUsers(userData as unknown as AppUser[] || []);
        }
        setLoading(false);
    };

    const handleOpenCreate = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            username: '',
            full_name: '',
            password: '',
            role: 'employee',
            is_active: true,
            selectedModules: [],
        });
        setErrors({});
        setDialogOpen(true);
    };

    const handleOpenEdit = (user: AppUser) => {
        setIsEditing(true);
        setEditingId(user.id);
        setFormData({
            username: user.username,
            full_name: user.full_name,
            password: '', // Leave blank unless changing
            role: user.role,
            is_active: user.is_active,
            selectedModules: user.assigned_modules.map(m => m.id),
        });
        setErrors({});
        setDialogOpen(true);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.username.trim()) newErrors.username = 'Username is required';
        if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';

        if (!isEditing) {
            if (!formData.password) newErrors.password = 'Password is required';
            else if (formData.password.length < 6) newErrors.password = 'Min 6 chars';
        } else {
            if (formData.password && formData.password.length < 6) newErrors.password = 'Min 6 chars';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);

        try {
            let result;
            if (isEditing && editingId) {
                // Update
                const payload: any = {
                    p_user_id: editingId,
                    p_full_name: formData.full_name,
                    p_role: formData.role,
                    p_is_active: formData.is_active,
                    p_module_ids: formData.selectedModules
                };
                if (formData.password) {
                    payload.p_password_hash = await hashPassword(formData.password);
                }

                const { data, error } = await (supabase as any).rpc('admin_update_user', payload);
                if (error) throw error;
                result = data;
            } else {
                // Create
                const hashedPassword = await hashPassword(formData.password);
                const { data, error } = await (supabase as any).rpc('admin_create_user', {
                    p_username: formData.username,
                    p_password_hash: hashedPassword,
                    p_full_name: formData.full_name,
                    p_role: formData.role,
                    p_module_ids: formData.selectedModules
                });
                if (error) throw error;
                result = data;
            }

            if (result && !result.success) {
                throw new Error(result.error || 'Operation failed');
            }

            toast({ title: 'Success', description: `User ${isEditing ? 'updated' : 'created'} successfully` });
            setDialogOpen(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const toggleModule = (id: string) => {
        setFormData(prev => {
            const current = prev.selectedModules;
            if (current.includes(id)) {
                return { ...prev, selectedModules: current.filter(m => m !== id) };
            } else {
                return { ...prev, selectedModules: [...current, id] };
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">System Users</h3>
                    <p className="text-sm text-muted-foreground">Manage users, roles, and module access permissions.</p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                </Button>
            </div>

            <div className="border rounded-lg bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Modules</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{u.full_name}</span>
                                        <span className="text-xs text-muted-foreground">@{u.username}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize bg-slate-100">
                                        {u.role.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {u.assigned_modules.length > 0 ? (
                                            u.assigned_modules.slice(0, 3).map(m => (
                                                <Badge key={m.id} variant="secondary" className="text-[10px] px-1 h-5">
                                                    {m.name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">None</span>
                                        )}
                                        {u.assigned_modules.length > 3 && (
                                            <span className="text-xs text-muted-foreground">+{u.assigned_modules.length - 3}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={u.is_active ? 'default' : 'destructive'} className={u.is_active ? 'bg-green-600 hover:bg-green-700' : ''}>
                                        {u.is_active ? 'Active' : 'Disabled'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(u)}>
                                        <Edit className="w-4 h-4 text-slate-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit User' : 'Create New User'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    disabled={isEditing} // Cannot change username on edit
                                    placeholder="jdoe"
                                    className={errors.username ? "border-destructive" : ""}
                                />
                                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="John Doe"
                                    className={errors.full_name ? "border-destructive" : ""}
                                />
                                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={v => setFormData({ ...formData, role: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="super_admin">Admin</SelectItem>
                                        <SelectItem value="hr_admin">HR Manager</SelectItem>
                                        <SelectItem value="employee">Employee</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={formData.is_active ? 'active' : 'inactive'}
                                    onValueChange={v => setFormData({ ...formData, is_active: v === 'active' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Disabled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{isEditing ? 'New Password (Optional)' : 'Password'}</Label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder={isEditing ? "Leave blank to keep current" : "Min 6 chars"}
                                className={errors.password ? "border-destructive" : ""}
                            />
                            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                Assigned Modules
                            </Label>
                            <div className="border rounded-md p-4 bg-slate-50 max-h-[200px] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-3">
                                    {allModules.map(m => (
                                        <div key={m.id} className="flex items-start gap-2">
                                            <Checkbox
                                                id={m.id}
                                                checked={formData.selectedModules.includes(m.id)}
                                                onCheckedChange={() => toggleModule(m.id)}
                                            />
                                            <div className="grid gap-0.5 leading-none">
                                                <label
                                                    htmlFor={m.id}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {m.name}
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Select the modules this user can access.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEditing ? 'Save Changes' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
