import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Filter,
  Mail,
  Phone,
  Building,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileText,
  Download,
  FileSpreadsheet,
  File as FileIcon,
  Building2,
  MapPin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { useAuth } from '@/contexts/AuthContext';
import { EmployeeDocuments } from '@/components/employee/EmployeeDocuments';
import { exportToPDF, exportToExcel, exportToWord, ExportableEmployee } from '@/lib/exportUtils';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  department_id: string | null;
  branch_id: string | null;
  status: string | null;
  avatar_url: string | null;
  joining_date: string;
  department?: { name: string } | null;
  branch?: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Branch { // Added
  id: string;
  name: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]); // Added
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchBranches(); // Added
  }, []);

  const fetchBranches = async () => { // Added
    try {
      const { data, error } = await (supabase as any)
        .from('branches')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select(`
          *,
          department:departments(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees((data || []) as any);
    } catch (error: any) {
      console.warn('Error fetching employees:', error);
      setError(error.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name');
    setDepartments(data || []);
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'Unassigned';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'inactive':
        return 'bg-muted/50 text-muted-foreground border-muted';
      case 'on_leave':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || emp.department_id === departmentFilter;
    const matchesBranch = branchFilter === 'all' || (emp.branch_id === branchFilter); // Added

    return matchesSearch && matchesStatus && matchesDepartment && matchesBranch; // Updated
  });

  const handleExport = async (type: 'pdf' | 'excel' | 'word', singleEmployee?: ExportableEmployee) => {
    const dataToExport: ExportableEmployee[] = singleEmployee
      ? [singleEmployee]
      : filteredEmployees.map(emp => ({
        ...emp,
        department_name: getDepartmentName(emp.department_id),
        phone: emp.phone,
        designation: emp.designation,
        status: emp.status,
      }));

    try {
      const filename = singleEmployee
        ? `${singleEmployee.full_name.replace(/\s+/g, '_')}_profile`
        : 'employee_data';

      if (type === 'pdf') {
        exportToPDF(dataToExport, filename);
      } else if (type === 'excel') {
        exportToExcel(dataToExport, filename);
      } else if (type === 'word') {
        await exportToWord(dataToExport, filename);
      }

      toast({
        title: "Export Successful!",
        description: `Data exported as ${type.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data.",
        variant: "destructive",
      });
    }
  };

  const prepareSingleEmployeeExport = (emp: Employee): ExportableEmployee => ({
    ...emp,
    department_name: getDepartmentName(emp.department_id),
    phone: emp.phone,
    designation: emp.designation,
    status: emp.status,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Employee Directory
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and view all employees in your organization
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('word')}>
                  <FileIcon className="w-4 h-4 mr-2" />
                  Export as Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => navigate('/employees/new')}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email or employee code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 input-glass"
                />
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] input-glass">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[160px] input-glass">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-[160px] input-glass">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-card border-0 animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="glass-card border-0 border-l-4 border-l-destructive">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4 text-destructive">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load employees</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {error || 'Unable to fetch employee data. Please check your connection and try again.'}
              </p>
              <Button onClick={() => fetchEmployees()} variant="outline" className="gap-2">
                Refresh
              </Button>
            </CardContent>
          </Card>
        ) : filteredEmployees.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No employees found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all' || branchFilter !== 'all' // Updated
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first employee'}
              </p>
              <Button
                onClick={() => navigate('/employees/new')}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee, index) => (
              <Card
                key={employee.id}
                className="glass-card-hover border-0 overflow-hidden group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarImage src={employee.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(employee.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{employee.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{employee.designation || 'No designation'}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/employees/${employee.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/employees/${employee.id}/edit`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          setSelectedEmployee(employee);
                          setIsDocumentsOpen(true);
                        }}>
                          <FileText className="w-4 h-4 mr-2" />
                          Documents
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground ml-2">Export Profile</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleExport('pdf', prepareSingleEmployeeExport(employee))}>
                          <FileText className="w-4 h-4 mr-2" />
                          PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('excel', prepareSingleEmployeeExport(employee))}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('word', prepareSingleEmployeeExport(employee))}>
                          <FileIcon className="w-4 h-4 mr-2" />
                          Word
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>{employee.department?.name || 'Unassigned'}</span>
                    </div>
                    {employee.branch?.name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{employee.branch.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">{employee.employee_code}</span>
                    <Badge variant="outline" className={getStatusColor(employee.status)}>
                      {employee.status || 'Unknown'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results count */}
        {!loading && filteredEmployees.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
        )}

        {/* Documents Modal */}
        {selectedEmployee && (
          <EmployeeDocuments
            employeeId={selectedEmployee.id}
            employeeName={selectedEmployee.full_name}
            isOpen={isDocumentsOpen}
            onClose={() => {
              setIsDocumentsOpen(false);
              setSelectedEmployee(null);
            }}
          />
        )}
      </div>
    </DashboardLayout >
  );
}