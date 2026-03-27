import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Percent,
  Save,
  Search,
  Building2,
  User,
  TrendingUp,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  type: 'earning' | 'deduction' | 'employer_contribution';
  description: string | null;
  is_taxable: boolean;
  is_fixed: boolean;
  calculation_type: string;
  is_statutory: boolean;
  is_active: boolean;
  display_order: number;
}

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
  salary: number | null;
  department: { name: string } | null;
}

interface EmployeeSalaryStructure {
  id: string;
  employee_id: string;
  component_id: string;
  amount: number;
  percentage: number | null;
  effective_from: string;
  component: SalaryComponent;
}

export function SalaryStructureManager() {
  const { toast } = useToast();
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeStructure, setEmployeeStructure] = useState<EmployeeSalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [structureAmounts, setStructureAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchComponents();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeStructure(selectedEmployee.id);
    }
  }, [selectedEmployee]);

  const fetchComponents = async () => {
    const { data, error } = await supabase
      .from('salary_components')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (!error) {
      setComponents(data || []);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, employee_code, salary, department:departments(name)')
      .eq('status', 'active')
      .order('full_name');

    if (!error) {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const fetchEmployeeStructure = async (employeeId: string) => {
    const { data, error } = await supabase
      .from('employee_salary_structures')
      .select('*, component:salary_components(*)')
      .eq('employee_id', employeeId)
      .eq('is_active', true);

    if (!error) {
      setEmployeeStructure(data || []);
      const amounts: Record<string, number> = {};
      data?.forEach(item => {
        amounts[item.component_id] = item.amount;
      });
      setStructureAmounts(amounts);
    }
  };

  const handleAmountChange = (componentId: string, value: string) => {
    setStructureAmounts(prev => ({
      ...prev,
      [componentId]: parseFloat(value) || 0,
    }));
  };

  const saveStructure = async () => {
    if (!selectedEmployee) return;
    
    setSaving(true);
    
    try {
      await supabase
        .from('employee_salary_structures')
        .delete()
        .eq('employee_id', selectedEmployee.id);

      const structures = Object.entries(structureAmounts)
        .filter(([_, amount]) => amount > 0)
        .map(([componentId, amount]) => ({
          employee_id: selectedEmployee.id,
          component_id: componentId,
          amount,
          effective_from: new Date().toISOString().split('T')[0],
        }));

      if (structures.length > 0) {
        const { error } = await supabase
          .from('employee_salary_structures')
          .insert(structures);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Salary structure saved successfully',
      });
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving structure:', error);
      toast({
        title: 'Error',
        description: 'Failed to save salary structure',
        variant: 'destructive',
      });
    }
    
    setSaving(false);
  };

  const calculateGross = () => {
    return components
      .filter(c => c.type === 'earning')
      .reduce((sum, c) => sum + (structureAmounts[c.id] || 0), 0);
  };

  const calculateDeductions = () => {
    return components
      .filter(c => c.type === 'deduction')
      .reduce((sum, c) => sum + (structureAmounts[c.id] || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      earning: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Earning' },
      deduction: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Deduction' },
      employer_contribution: { color: 'bg-primary/10 text-primary border-primary/20', label: 'Employer' },
    };
    const c = config[type] || config.earning;
    return <Badge variant="outline" className={cn('text-xs border', c.color)}>{c.label}</Badge>;
  };

  return (
    <>
      <Card className="bg-white border border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Salary Structures</CardTitle>
                <CardDescription>Manage employee salary components and structures</CardDescription>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[250px] bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-medium text-muted-foreground">No employees found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Base Salary</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {employee.full_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{employee.full_name}</p>
                            <p className="text-xs text-muted-foreground">{employee.employee_code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {employee.department?.name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">
                          {employee.salary ? formatCurrency(employee.salary) : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            const basicComponent = components.find(c => c.code === 'BASIC');
                            if (basicComponent && employee.salary) {
                              setStructureAmounts({ [basicComponent.id]: employee.salary });
                            }
                            setDialogOpen(true);
                          }}
                          className="gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                        >
                          <Edit className="w-4 h-4" />
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Structure Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Configure Salary Structure</DialogTitle>
                <DialogDescription>
                  {selectedEmployee?.full_name} ({selectedEmployee?.employee_code})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Earnings Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-emerald-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Earnings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {components.filter(c => c.type === 'earning').map((component) => (
                  <div key={component.id} className="space-y-2 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      {component.name}
                      {component.is_taxable && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
                          Taxable
                        </Badge>
                      )}
                    </Label>
                    <Input
                      type="number"
                      value={structureAmounts[component.id] || ''}
                      onChange={(e) => handleAmountChange(component.id, e.target.value)}
                      className="bg-white border-emerald-200 focus:border-emerald-400"
                      placeholder="0"
                    />
                    {component.description && (
                      <p className="text-xs text-muted-foreground">{component.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-amber-600 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Deductions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {components.filter(c => c.type === 'deduction').map((component) => (
                  <div key={component.id} className="space-y-2 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      {component.name}
                      {component.is_statutory && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                          Statutory
                        </Badge>
                      )}
                    </Label>
                    <Input
                      type="number"
                      value={structureAmounts[component.id] || ''}
                      onChange={(e) => handleAmountChange(component.id, e.target.value)}
                      className="bg-white border-amber-200 focus:border-amber-400"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Gross Earnings</span>
                </div>
                <span className="font-bold text-emerald-600">{formatCurrency(calculateGross())}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Total Deductions</span>
                </div>
                <span className="font-bold text-amber-600">{formatCurrency(calculateDeductions())}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="font-semibold">Net Salary</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(calculateGross() - calculateDeductions())}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveStructure} disabled={saving} className="bg-primary hover:bg-primary/90 gap-2">
              {saving ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4" />
                  Save Structure
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
