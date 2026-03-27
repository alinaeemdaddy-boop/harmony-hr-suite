import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, MapPin, Phone, Mail, Building2, Store, Eye, LayoutGrid, List, Filter, ArrowUpDown, Pencil, Trash2, Palette } from 'lucide-react';
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
    status: string | null;
    operating_hours?: string;
    color?: string;
}

const COLORS = [
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Green', value: 'bg-emerald-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Orange', value: 'bg-orange-500' },
    { name: 'Rose', value: 'bg-rose-500' },
    { name: 'Indigo', value: 'bg-indigo-500' },
    { name: 'Slate', value: 'bg-slate-500' },
];

export default function Branches() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [employees, setEmployees] = useState<{ id: string, full_name: string, employee_code: string }[]>([]);
    const { role } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'city' | 'status'>('name');

    // Form State
    const [formData, setFormData] = useState<Partial<Branch>>({
        status: 'active',
        color: 'bg-blue-500',
    });

    useEffect(() => {
        fetchBranches();
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('id, full_name, employee_code')
            .eq('status', 'active')
            .order('full_name');
        setEmployees(data || []);
    };

    const fetchBranches = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('branches')
                .select('*')
                .order('name');

            if (error) throw error;
            setBranches(data || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateBranchCode = (city: string) => {
        if (!city) return '';
        const prefix = city.substring(0, 3).toUpperCase();
        const random = Math.floor(Math.random() * 999) + 1;
        return `${prefix}-${random.toString().padStart(3, '0')}`;
    };

    const handleCityChange = (city: string) => {
        const updates: any = { city };
        // Auto-generate code if adding new branch and code is empty
        if (!editingId && !formData.branch_code) {
            updates.branch_code = generateBranchCode(city);
        }
        setFormData({ ...formData, ...updates });
    };

    const handleSaveBranch = async () => {
        try {
            if (!formData.name || !formData.city || !formData.branch_code) {
                toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
                return;
            }

            const payload = { ...formData };

            let error;
            if (editingId) {
                // Update
                const { error: updateError } = await (supabase as any)
                    .from('branches')
                    .update(payload)
                    .eq('id', editingId);
                error = updateError;
            } else {
                // Create
                const { error: insertError } = await (supabase as any)
                    .from('branches')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: 'Success',
                description: `Branch ${editingId ? 'updated' : 'created'} successfully`,
            });
            setIsDialogOpen(false);
            resetForm();
            fetchBranches();
        } catch (error: any) {
            console.error('Error saving branch:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save branch',
                variant: 'destructive',
            });
        }
    };

    const confirmDelete = (id: string) => {
        setDeletingId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteBranch = async () => {
        if (!deletingId) return;
        try {
            const { error } = await (supabase as any)
                .from('branches')
                .delete()
                .eq('id', deletingId);

            if (error) throw error;

            toast({ title: 'Success', description: 'Branch deleted successfully' });
            fetchBranches();
        } catch (error: any) {
            toast({ title: 'Error', description: 'Failed to delete branch. Check if it has employees assigned.', variant: 'destructive' });
        } finally {
            setIsDeleteDialogOpen(false);
            setDeletingId(null);
        }
    };

    const openEdit = (branch: Branch) => {
        setEditingId(branch.id);
        setFormData({
            name: branch.name,
            branch_code: branch.branch_code,
            city: branch.city,
            area: branch.area,
            address: branch.address,
            contact_number: branch.contact_number,
            email: branch.email,
            status: branch.status,
            manager_id: branch.manager_id,
            operating_hours: branch.operating_hours,
            color: branch.color || 'bg-blue-500' // Default if missing
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ status: 'active', color: 'bg-blue-500' });
    };

    // Extract unique cities for filter
    const uniqueCities = Array.from(new Set(branches.map(b => b.city))).sort();

    const filteredBranches = branches
        .filter(branch => {
            const matchesSearch =
                branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                branch.branch_code.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'all' || branch.status === statusFilter;
            const matchesCity = cityFilter === 'all' || branch.city === cityFilter;

            return matchesSearch && matchesStatus && matchesCity;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'city') return a.city.localeCompare(b.city);
            if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
            return 0;
        });

    const canManage = role === 'super_admin' || role === 'hr_admin';

    // Helper Action Buttons
    const ActionButtons = ({ branch }: { branch: Branch }) => (
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); openEdit(branch); }}>
                <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); confirmDelete(branch.id); }}>
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in pb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                            Branch Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage office locations and branches
                        </p>
                    </div>
                    {canManage && (
                        <div className="flex gap-2">
                            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Branch
                            </Button>
                        </div>
                    )}
                </div>

                {/* Toolbar */}
                <Card className="glass-card border-0">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2 border border-input focus-within:ring-1 focus-within:ring-ring transition-all w-full md:w-auto flex-1 max-w-sm">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search branches..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            <Select value={cityFilter} onValueChange={setCityFilter}>
                                <SelectTrigger className="w-[140px] bg-background/50 file:border-0 border-border/50">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="City" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Cities</SelectItem>
                                    {uniqueCities.map(city => (
                                        <SelectItem key={city} value={city}>{city}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                <SelectTrigger className="w-[130px] bg-background/50 border-border/50">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="bg-background/50 border-border/50">
                                        <ArrowUpDown className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSortBy('name')}>Name</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortBy('city')}>City</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortBy('status')}>Status</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex items-center bg-background/50 rounded-lg border border-border/50 p-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 rounded-sm ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                                    onClick={() => setViewMode('grid')}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 rounded-sm ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Content */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBranches.map(branch => (
                            <Card key={branch.id} className="glass-card border-0 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
                                {/* Color Strip */}
                                <div className={`absolute top-0 left-0 w-1 h-full ${branch.color || 'bg-primary'}`} />

                                <CardHeader className="flex flex-row items-start justify-between pb-2 pl-6">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2 text-xl">
                                            {/* Store Icon */}
                                            <div className={`p-2 rounded-lg ${branch.color ? branch.color + '/10' : 'bg-primary/10'}`}>
                                                <Store className={`w-5 h-5 ${branch.color?.replace('bg-', 'text-') || 'text-primary'}`} />
                                            </div>
                                            {branch.name}
                                        </CardTitle>
                                        <CardDescription>
                                            {branch.branch_code}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={branch.status === 'active' ? 'default' : 'secondary'} className={branch.status === 'active' ? 'bg-success/10 text-success' : ''}>
                                        {branch.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="space-y-4 pl-6">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="w-4 h-4" />
                                            <span>{branch.city}{branch.area ? `, ${branch.area}` : ''}</span>
                                        </div>
                                        {branch.contact_number && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Phone className="w-4 h-4" />
                                                <span>{branch.contact_number}</span>
                                            </div>
                                        )}
                                        {branch.email && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Mail className="w-4 h-4" />
                                                <span className="truncate">{branch.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 pl-6 flex justify-between items-center">
                                    <Button
                                        className="bg-primary/5 hover:bg-primary/10 text-primary"
                                        size="sm"
                                        onClick={() => navigate(`/branches/${branch.id}`)}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Details
                                    </Button>
                                    {canManage && <ActionButtons branch={branch} />}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredBranches.map(branch => (
                            <Card key={branch.id} className="glass-card border-0 hover:shadow-md transition-all relative overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${branch.color || 'bg-primary'}`} />
                                <div className="p-4 pl-6 flex flex-col md:flex-row items-center gap-4">
                                    <div className={`p-3 rounded-full ${branch.color ? branch.color + '/10' : 'bg-primary/10'}`}>
                                        <Store className={`w-6 h-6 ${branch.color?.replace('bg-', 'text-') || 'text-primary'}`} />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="font-semibold text-lg">{branch.name}</h3>
                                        <p className="text-sm text-muted-foreground">{branch.branch_code} • {branch.city}</p>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            <span className="hidden lg:inline">{branch.contact_number || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <Badge variant={branch.status === 'active' ? 'default' : 'secondary'} className={branch.status === 'active' ? 'bg-success/10 text-success' : ''}>
                                        {branch.status}
                                    </Badge>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/branches/${branch.id}`)}
                                        >
                                            View
                                        </Button>
                                        {canManage && <ActionButtons branch={branch} />}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {filteredBranches.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No branches found</p>
                    </div>
                )}

                {/* Add/Edit Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Branch Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Tariq Road"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">Branch ID/Code *</Label>
                                    <Input
                                        id="code"
                                        placeholder="e.g. KHI-001"
                                        value={formData.branch_code || ''}
                                        onChange={e => setFormData({ ...formData, branch_code: e.target.value })}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Auto-generated or custom</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City *</Label>
                                    <Select
                                        value={formData.city || ''}
                                        onValueChange={handleCityChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select City" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Karachi">Karachi</SelectItem>
                                            <SelectItem value="Lahore">Lahore</SelectItem>
                                            <SelectItem value="Islamabad">Islamabad</SelectItem>
                                            <SelectItem value="Faisalabad">Faisalabad</SelectItem>
                                            <SelectItem value="New York">New York</SelectItem>
                                            <SelectItem value="London">London</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="area">Area</Label>
                                    <Input
                                        id="area"
                                        placeholder="e.g. PECHS Block 2"
                                        value={formData.area || ''}
                                        onChange={e => setFormData({ ...formData, area: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Full Address</Label>
                                <Input
                                    id="address"
                                    placeholder="Street address..."
                                    value={formData.address || ''}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Contact Number</Label>
                                    <Input
                                        id="phone"
                                        placeholder="+92..."
                                        value={formData.contact_number || ''}
                                        onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Branch Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="branch@company.com"
                                        value={formData.email || ''}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.status || 'active'}
                                        onValueChange={(val: 'active' | 'inactive') => setFormData({ ...formData, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manager">Branch Manager</Label>
                                    <Select
                                        value={formData.manager_id || undefined}
                                        onValueChange={(val) => setFormData({ ...formData, manager_id: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a manager" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.full_name} ({emp.employee_code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Color Code (Visual Category)</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: c.value })}
                                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${c.value} ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveBranch} disabled={!formData.name || !formData.city || !formData.branch_code}>
                                {editingId ? 'Save Changes' : 'Create Branch'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Alert */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the branch
                                and potentially affect assigned employees.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteBranch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Branch
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>
        </DashboardLayout >
    );
}
