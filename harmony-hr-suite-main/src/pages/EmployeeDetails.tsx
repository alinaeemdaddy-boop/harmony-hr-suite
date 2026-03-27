import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  Building,
  Calendar,
  MapPin,
  User,
  Briefcase,
  FileText,
  Clock,
  Camera,
  Loader2,
  Download,
  FileSpreadsheet,
  File as FileIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { exportToPDF, exportToExcel, exportToWord, ExportableEmployee } from '@/lib/exportUtils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDocuments } from '@/components/employee/EmployeeDocuments';
import { ContractManager } from '@/components/employee/ContractManager';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  status: string | null;
  avatar_url: string | null;
  joining_date: string;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  employment_type: string | null;
  salary: number | null;
  branch_id: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEmployee(data as any);

      if (data.department_id) {
        const { data: deptData } = await supabase
          .from('departments')
          .select('id, name')
          .eq('id', data.department_id)
          .single();
        setDepartment(deptData);
      }

      if ((data as any).branch_id) {
        const { data: branchData } = await (supabase
          .from('branches' as any)
          .select('id, name')
          .eq('id', (data as any).branch_id)
          .single() as any);
        setBranch(branchData);
      }
    } catch (error: any) {
      console.error('Error fetching employee:', error);
      setError(error.message || 'Failed to fetch employee details');
      toast({
        title: 'Connection Error',
        description: 'Unable to fetch employee details. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      // Create canvas to resize image to 1080px
      const resizedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 1080;
            let width = img.width;
            let height = img.height;

            // Scale down to 1080px maintaining aspect ratio
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.9));
          };
          img.onerror = reject;
          img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Update employee avatar_url in database
      const { error } = await supabase
        .from('employees')
        .update({ avatar_url: resizedDataUrl })
        .eq('id', employee.id);

      if (error) throw error;

      // Update local state
      setEmployee({ ...employee, avatar_url: resizedDataUrl });

      toast({
        title: 'Photo Updated',
        description: 'Profile picture has been updated successfully',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to update profile picture',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

  const formatDate = (date: string | null) => {
    return format(new Date(date), 'MMMM d, yyyy');
  };

  const handleExportProfile = async (type: 'pdf' | 'excel' | 'word') => {
    if (!employee) return;

    const dataToExport: ExportableEmployee[] = [{
      ...employee,
      department_name: department?.name || 'Unassigned',
      // Ensure all fields are mapped correctly for the detailed export
      date_of_birth: employee.date_of_birth,
      gender: employee.gender,
      address: employee.address,
      city: employee.city,
      state: employee.state,
      country: employee.country,
      postal_code: employee.postal_code,
      employment_type: employee.employment_type,
      emergency_contact_name: employee.emergency_contact_name,
      emergency_contact_phone: employee.emergency_contact_phone,
      salary: employee.salary,
    }];

    const filename = `${employee.full_name.replace(/\s+/g, '_')}_profile`;

    try {
      if (type === 'pdf') {
        exportToPDF(dataToExport, filename);
      } else if (type === 'excel') {
        exportToExcel(dataToExport, filename);
      } else if (type === 'word') {
        await exportToWord(dataToExport, filename);
      }

      toast({
        title: "Export Successful!",
        description: `Profile exported as ${type.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the profile.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load employee details</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {error || 'We could not retrieve the employee information.'}
          </p>
          <Button onClick={fetchEmployee} variant="outline" className="gap-2">
            Refresh
          </Button>
          <Button variant="ghost" onClick={() => navigate('/employees')} className="mt-4">
            Back to Employees
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Employee not found</p>
          <Button onClick={() => navigate('/employees')} className="mt-4">
            Back to Employees
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/employees')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                Employee Details
              </h1>
              <p className="text-muted-foreground mt-1">
                View employee information
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDocumentsOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </Button>

            {(role === 'super_admin' || role === 'hr_admin') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export Profile
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExportProfile('pdf')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportProfile('excel')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportProfile('word')}>
                    <FileIcon className="w-4 h-4 mr-2" />
                    Export as Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              onClick={() => navigate(`/employees/${id}/edit`)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Employee
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="glass-card border-0 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-all shadow-lg opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h2 className="text-2xl font-bold text-foreground">{employee.full_name}</h2>
                  <Badge variant="outline" className={getStatusColor(employee.status)}>
                    {employee.status || 'Unknown'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  {employee.designation || 'No designation'} • {employee.employee_code}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{employee.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{employee.gender || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{formatDate(employee.date_of_birth)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employee Code</p>
                  <p className="font-medium">{employee.employee_code}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{employee.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{employee.phone || 'Not specified'}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Emergency Contact</p>
                <p className="font-medium">{employee.emergency_contact_name || 'Not specified'}</p>
                {employee.emergency_contact_phone && (
                  <p className="text-sm text-muted-foreground">{employee.emergency_contact_phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{department?.name || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Branch</p>
                  <p className="font-medium">{branch?.name || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Designation</p>
                  <p className="font-medium">{employee.designation || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employment Type</p>
                  <p className="font-medium capitalize">{employee.employment_type?.replace('_', ' ') || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joining Date</p>
                  <p className="font-medium">{formatDate(employee.joining_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employee.address ? (
                <div className="space-y-1">
                  <p className="font-medium">{employee.address}</p>
                  <p className="text-muted-foreground">
                    {[employee.city, employee.state, employee.postal_code].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-muted-foreground">{employee.country || ''}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No address specified</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contract Management Section */}
        <div className="mt-8">
          <ContractManager employeeId={employee.id} employeeName={employee.full_name} />
        </div>

        {/* Documents Modal */}
        <EmployeeDocuments
          employeeId={employee.id}
          employeeName={employee.full_name}
          isOpen={documentsOpen}
          onClose={() => setDocumentsOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
