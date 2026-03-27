import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building, Users, Edit, Trash2, Loader2, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  employee_count?: number;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const { toast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'super_admin' || role === 'hr_admin';

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const { data: depts, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;

      const deptsWithCounts = await Promise.all(
        (depts || []).map(async (dept) => {
          const { count } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id);

          return { ...dept, employee_count: count || 0 };
        })
      );

      setDepartments(deptsWithCounts);
    } catch (error) {
      console.warn('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ name: dept.name, description: dept.description || '' });
    } else {
      setEditingDept(null);
      setFormData({ name: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Department name is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update({ name: formData.name, description: formData.description || null })
          .eq('id', editingDept.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Department updated successfully' });
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([{ name: formData.name, description: formData.description || null }]);
        if (error) throw error;
        toast({ title: 'Success', description: 'Department created successfully' });
      }
      setDialogOpen(false);
      fetchDepartments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save department', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Department deleted successfully' });
      fetchDepartments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete department', variant: 'destructive' });
    }
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalEmployees = departments.reduce((sum, d) => sum + (d.employee_count || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
                Departments
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {departments.length} department{departments.length !== 1 ? 's' : ''} · {totalEmployees} total employees
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={fetchDepartments} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {isAdmin && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Add Department</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card border-border mx-4 sm:mx-auto max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-display">
                        {editingDept ? 'Edit Department' : 'Add Department'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="input-glass"
                          placeholder="Department name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="input-glass"
                          placeholder="Brief description"
                        />
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments..."
              className="pl-9 input-glass"
            />
          </div>
        </div>

        {/* Department Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-card border-0 animate-pulse">
                <CardContent className="p-4 sm:p-6">
                  <div className="h-6 w-32 bg-muted rounded mb-2" />
                  <div className="h-4 w-full bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Building className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                {search ? 'No matching departments' : 'No departments yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search ? 'Try a different search term' : 'Create your first department to organize employees'}
              </p>
              {!search && isAdmin && (
                <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Department
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((dept, index) => (
              <Card
                key={dept.id}
                className="glass-card-hover border-0 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10">
                      <Building className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(dept)} className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)} className="h-8 w-8 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">{dept.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                    {dept.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground pt-3 border-t border-border/30">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{dept.employee_count} employee{dept.employee_count !== 1 ? 's' : ''}</span>
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
