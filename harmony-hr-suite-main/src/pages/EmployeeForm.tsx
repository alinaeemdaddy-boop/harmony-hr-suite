import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Loader2, Save, User, Briefcase, Phone, MapPin, Shield, DollarSign, FileText, Calendar, CheckCircle, RotateCcw, Edit3, Camera, Upload, X } from 'lucide-react';
import { FormStepper } from '@/components/employee/FormStepper';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface TempDocument {
  file: File;
  category: 'id_proof' | 'certificates' | 'other';
  preview?: string;
}

interface EmployeeFormData {
  // Personal Information (~25 fields)
  avatar_url: string;
  employee_code: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  nationality: string;
  blood_group: string;
  religion: string;
  social_security_number: string;
  passport_number: string;
  passport_expiry: string;
  national_id: string;
  driving_license: string;
  driving_license_expiry: string;
  preferred_language: string;
  hobbies: string;
  profile_summary: string;
  father_name: string;
  mother_name: string;
  spouse_name: string;
  education_level: string;

  // Contact Information
  email: string;
  phone: string;
  alternate_phone: string;
  personal_email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  permanent_address: string;
  permanent_city: string;
  permanent_state: string;
  permanent_country: string;
  permanent_postal_code: string;

  // Employment Information
  department_id: string;
  branch_id: string;
  designation: string;
  employment_type: string;
  joining_date: string;
  status: string;
  probation_end_date: string;
  confirmation_date: string;
  work_location: string;
  reporting_manager_id: string;
  employee_grade: string;
  shift_type: string;

  // Compensation
  salary: string;
  pay_frequency: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  pan_number: string;

  // Emergency Contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  emergency_contact_address: string;
}

const initialFormData: EmployeeFormData = {
  // Personal Information
  avatar_url: '',
  employee_code: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  full_name: '',
  date_of_birth: '',
  gender: '',
  marital_status: '',
  nationality: '',
  blood_group: '',
  religion: '',
  social_security_number: '',
  passport_number: '',
  passport_expiry: '',
  national_id: '',
  driving_license: '',
  driving_license_expiry: '',
  preferred_language: '',
  hobbies: '',
  profile_summary: '',
  father_name: '',
  mother_name: '',
  spouse_name: '',
  education_level: '',

  // Contact Information
  email: '',
  phone: '',
  alternate_phone: '',
  personal_email: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  permanent_address: '',
  permanent_city: '',
  permanent_state: '',
  permanent_country: '',
  permanent_postal_code: '',

  // Employment Information
  department_id: '',
  branch_id: '',
  designation: '',
  employment_type: 'full_time',
  joining_date: new Date().toISOString().split('T')[0],
  status: 'active',
  probation_end_date: '',
  confirmation_date: '',
  work_location: '',
  reporting_manager_id: '',
  employee_grade: '',
  shift_type: 'day',

  // Compensation
  salary: '',
  pay_frequency: 'monthly',
  bank_name: '',
  bank_account_number: '',
  bank_ifsc: '',
  pan_number: '',

  // Emergency Contact
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  emergency_contact_address: '',
};

const steps = [
  { id: 0, label: 'Personal Information', icon: <User className="w-4 h-4" /> },
  { id: 1, label: 'Contact Information', icon: <Phone className="w-4 h-4" /> },
  { id: 2, label: 'Employment Information', icon: <Briefcase className="w-4 h-4" /> },
  { id: 3, label: 'Compensation', icon: <DollarSign className="w-4 h-4" /> },
  { id: 4, label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { id: 5, label: 'Leave & Attendance', icon: <Calendar className="w-4 h-4" /> },
  { id: 6, label: 'Review & Submit', icon: <CheckCircle className="w-4 h-4" /> },
];

export default function EmployeeForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tempDocuments, setTempDocuments] = useState<TempDocument[]>([]);

  const contentRef = useRef<HTMLDivElement>(null);

  // Load form data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('employeeFormDraft');
    if (savedData && !isEditing) {
      const parsed = JSON.parse(savedData);
      setFormData(parsed.formData || initialFormData);
      setCompletedSteps(parsed.completedSteps || []);
      setCurrentStep(parsed.currentStep || 0);
    }
  }, [isEditing]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (!isEditing) {
      localStorage.setItem('employeeFormDraft', JSON.stringify({
        formData,
        completedSteps,
        currentStep
      }));
    }
  }, [formData, completedSteps, currentStep, isEditing]);

  useEffect(() => {
    fetchDepartments();
    fetchBranches();
    if (isEditing) {
      fetchEmployee();
    } else {
      generateEmployeeCode();
    }
  }, [id]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name');
    setDepartments(data || []);
  };

  const fetchBranches = async () => {
    const { data } = await (supabase as any).from('branches').select('id, name').eq('status', 'active');
    setBranches(data || []);
  };

  const fetchEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          ...initialFormData,
          avatar_url: data.avatar_url || '',
          employee_code: data.employee_code || '',
          first_name: data.full_name?.split(' ')[0] || '',
          middle_name: '',
          last_name: data.full_name?.split(' ').slice(1).join(' ') || '',
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          postal_code: data.postal_code || '',
          department_id: data.department_id || '',
          branch_id: (data as any).branch_id || '',
          designation: data.designation || '',
          employment_type: data.employment_type || 'full_time',
          joining_date: data.joining_date || '',
          status: data.status || 'active',
          salary: data.salary?.toString() || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
        });
        // Mark all steps as completed for editing
        setCompletedSteps([0, 1, 2, 3, 4, 5]);
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch employee details',
        variant: 'destructive',
      });
    } finally {
      setFetching(false);
    }
  };

  const generateEmployeeCode = async () => {
    const { count } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    const newCode = `EMP${String((count || 0) + 1).padStart(5, '0')}`;
    setFormData(prev => ({ ...prev, employee_code: newCode }));
  };

  const handleChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-compute full_name when first, middle, or last name changes
      if (field === 'first_name' || field === 'middle_name' || field === 'last_name') {
        updated.full_name = [updated.first_name, updated.middle_name, updated.last_name]
          .filter(Boolean)
          .join(' ');
      }
      return updated;
    });
  };

  const handleTempDocumentUpload = (files: FileList | null, category: TempDocument['category']) => {
    if (!files) return;

    const newDocs: TempDocument[] = Array.from(files).map(file => ({
      file,
      category,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setTempDocuments(prev => [...prev, ...newDocs]);
    toast({
      title: 'Document Added',
      description: `${files.length} file(s) added. They will be uploaded when you save the employee.`,
    });
  };

  const removeTempDocument = (index: number) => {
    setTempDocuments(prev => {
      const doc = prev[index];
      if (doc.preview) URL.revokeObjectURL(doc.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadTempDocuments = async (employeeId: string) => {
    for (const doc of tempDocuments) {
      const fileExt = doc.file.name.split('.').pop();
      const fileName = `${employeeId}/${doc.category}/${Date.now()}_${doc.file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, doc.file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName);

      await supabase.from('employee_documents').insert({
        employee_id: employeeId,
        document_name: doc.file.name,
        document_type: fileExt || 'unknown',
        document_category: doc.category,
        file_url: urlData.publicUrl,
        file_size: doc.file.size,
        mime_type: doc.file.type,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const employeeData = {
        employee_code: formData.employee_code,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        postal_code: formData.postal_code || null,
        department_id: formData.department_id || null,
        branch_id: formData.branch_id || null,
        designation: formData.designation || null,
        employment_type: formData.employment_type || null,
        joining_date: formData.joining_date,
        status: formData.status || 'active',
        salary: formData.salary ? parseFloat(formData.salary) : null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        avatar_url: formData.avatar_url || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', id);

        if (error) throw error;

        // Upload any new temp documents for existing employee
        if (tempDocuments.length > 0) {
          await uploadTempDocuments(id!);
          setTempDocuments([]);
        }

        toast({
          title: 'Success',
          description: 'Employee updated successfully',
        });
      } else {
        const { data, error } = await supabase
          .from('employees')
          .insert([employeeData])
          .select('id')
          .single();

        if (error) throw error;

        // Upload temp documents for new employee
        if (tempDocuments.length > 0 && data?.id) {
          await uploadTempDocuments(data.id);
          setTempDocuments([]);
        }

        // Clear draft on successful submit
        localStorage.removeItem('employeeFormDraft');

        toast({
          title: 'Success',
          description: 'Employee added successfully',
        });
      }

      navigate('/employees');
    } catch (error: any) {
      console.error('Error saving employee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save employee',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (step: number) => {
    if (step === currentStep) return;

    setIsTransitioning(true);

    // Mark current step as completed when moving forward
    if (step > currentStep && !completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }

    setTimeout(() => {
      setCurrentStep(step);
      // Scroll to top of content
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => setIsTransitioning(false), 300);
    }, 150);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setCompletedSteps([]);
    setCurrentStep(0);
    localStorage.removeItem('employeeFormDraft');
    generateEmployeeCode();
    toast({
      title: 'Form Reset',
      description: 'All fields have been cleared',
    });
  };

  const saveDraft = () => {
    localStorage.setItem('employeeFormDraft', JSON.stringify({
      formData,
      completedSteps,
      currentStep
    }));
    toast({
      title: 'Draft Saved',
      description: 'Your progress has been saved',
    });
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

      // Create canvas to resize image to 1080px
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

          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          handleChange('avatar_url', resizedDataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const renderPersonalInformation = () => (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5 text-primary" />
          Personal Information
        </CardTitle>
        <CardDescription>Basic personal details and identification information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Employee Picture */}
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b border-border/50">
          <div className="relative group">
            <div className="w-[180px] h-[180px] rounded-xl overflow-hidden bg-muted/50 border-2 border-dashed border-border/50 flex items-center justify-center transition-all group-hover:border-primary/50">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt="Employee"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="w-10 h-10" />
                  <span className="text-xs">No photo</span>
                </div>
              )}
            </div>
            <label
              htmlFor="avatar_upload"
              className="absolute bottom-2 right-2 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
            >
              <Upload className="w-4 h-4" />
            </label>
            <input
              id="avatar_upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <h4 className="text-sm font-semibold text-foreground">Employee Photo</h4>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Upload a professional photo. Image will be resized to 1080px. Max size: 5MB.
            </p>
            {formData.avatar_url && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleChange('avatar_url', '')}
                className="mt-2 w-fit"
              >
                Remove Photo
              </Button>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_code">Employee Code</Label>
              <Input
                id="employee_code"
                value={formData.employee_code}
                onChange={(e) => handleChange('employee_code', e.target.value)}
                className="input-glass"
                readOnly={isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className="input-glass"
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input
                id="middle_name"
                value={formData.middle_name}
                onChange={(e) => handleChange('middle_name', e.target.value)}
                className="input-glass"
                placeholder="Enter middle name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className="input-glass"
                placeholder="Enter last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                className="input-glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                <SelectTrigger className="input-glass">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marital_status">Marital Status</Label>
              <Select value={formData.marital_status} onValueChange={(v) => handleChange('marital_status', v)}>
                <SelectTrigger className="input-glass">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
                className="input-glass"
                placeholder="Enter nationality"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blood_group">Blood Group</Label>
              <Select value={formData.blood_group} onValueChange={(v) => handleChange('blood_group', v)}>
                <SelectTrigger className="input-glass">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Identity Documents */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Identity Documents</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="social_security_number">Social Security Number</Label>
              <Input
                id="social_security_number"
                value={formData.social_security_number}
                onChange={(e) => handleChange('social_security_number', e.target.value)}
                className="input-glass"
                placeholder="XXX-XX-XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="national_id">National ID</Label>
              <Input
                id="national_id"
                value={formData.national_id}
                onChange={(e) => handleChange('national_id', e.target.value)}
                className="input-glass"
                placeholder="Enter national ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passport_number">Passport Number</Label>
              <Input
                id="passport_number"
                value={formData.passport_number}
                onChange={(e) => handleChange('passport_number', e.target.value)}
                className="input-glass"
                placeholder="Enter passport number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passport_expiry">Passport Expiry Date</Label>
              <Input
                id="passport_expiry"
                type="date"
                value={formData.passport_expiry}
                onChange={(e) => handleChange('passport_expiry', e.target.value)}
                className="input-glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driving_license">Driving License</Label>
              <Input
                id="driving_license"
                value={formData.driving_license}
                onChange={(e) => handleChange('driving_license', e.target.value)}
                className="input-glass"
                placeholder="Enter license number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driving_license_expiry">License Expiry Date</Label>
              <Input
                id="driving_license_expiry"
                type="date"
                value={formData.driving_license_expiry}
                onChange={(e) => handleChange('driving_license_expiry', e.target.value)}
                className="input-glass"
              />
            </div>
          </div>
        </div>

        {/* Family Information */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Family Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="father_name">Father's Name</Label>
              <Input
                id="father_name"
                value={formData.father_name}
                onChange={(e) => handleChange('father_name', e.target.value)}
                className="input-glass"
                placeholder="Enter father's name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mother_name">Mother's Name</Label>
              <Input
                id="mother_name"
                value={formData.mother_name}
                onChange={(e) => handleChange('mother_name', e.target.value)}
                className="input-glass"
                placeholder="Enter mother's name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spouse_name">Spouse Name</Label>
              <Input
                id="spouse_name"
                value={formData.spouse_name}
                onChange={(e) => handleChange('spouse_name', e.target.value)}
                className="input-glass"
                placeholder="Enter spouse name"
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Additional Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Input
                id="religion"
                value={formData.religion}
                onChange={(e) => handleChange('religion', e.target.value)}
                className="input-glass"
                placeholder="Enter religion"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_language">Preferred Language</Label>
              <Select value={formData.preferred_language} onValueChange={(v) => handleChange('preferred_language', v)}>
                <SelectTrigger className="input-glass">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="german">German</SelectItem>
                  <SelectItem value="chinese">Chinese</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="arabic">Arabic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="education_level">Education Level</Label>
              <Select value={formData.education_level} onValueChange={(v) => handleChange('education_level', v)}>
                <SelectTrigger className="input-glass">
                  <SelectValue placeholder="Select education" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high_school">High School</SelectItem>
                  <SelectItem value="associate">Associate Degree</SelectItem>
                  <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                  <SelectItem value="master">Master's Degree</SelectItem>
                  <SelectItem value="doctorate">Doctorate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hobbies">Hobbies & Interests</Label>
              <Input
                id="hobbies"
                value={formData.hobbies}
                onChange={(e) => handleChange('hobbies', e.target.value)}
                className="input-glass"
                placeholder="Enter hobbies"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="profile_summary">Profile Summary</Label>
              <Textarea
                id="profile_summary"
                value={formData.profile_summary}
                onChange={(e) => handleChange('profile_summary', e.target.value)}
                className="input-glass min-h-[80px]"
                placeholder="Brief description about the employee..."
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderContactInformation = () => (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="w-5 h-5 text-primary" />
          Contact Information
        </CardTitle>
        <CardDescription>Contact details and address information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Details */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Contact Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="input-glass"
                placeholder="work@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal_email">Personal Email</Label>
              <Input
                id="personal_email"
                type="email"
                value={formData.personal_email}
                onChange={(e) => handleChange('personal_email', e.target.value)}
                className="input-glass"
                placeholder="personal@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="input-glass"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alternate_phone">Alternate Phone</Label>
              <Input
                id="alternate_phone"
                value={formData.alternate_phone}
                onChange={(e) => handleChange('alternate_phone', e.target.value)}
                className="input-glass"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </div>

        {/* Current Address */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Current Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="input-glass min-h-[80px]"
                placeholder="Enter street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="input-glass"
                placeholder="Enter city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="input-glass"
                placeholder="Enter state"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="input-glass"
                placeholder="Enter country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                className="input-glass"
                placeholder="Enter postal code"
              />
            </div>
          </div>
        </div>

        {/* Permanent Address */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Permanent Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="permanent_address">Street Address</Label>
              <Textarea
                id="permanent_address"
                value={formData.permanent_address}
                onChange={(e) => handleChange('permanent_address', e.target.value)}
                className="input-glass min-h-[80px]"
                placeholder="Enter permanent street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permanent_city">City</Label>
              <Input
                id="permanent_city"
                value={formData.permanent_city}
                onChange={(e) => handleChange('permanent_city', e.target.value)}
                className="input-glass"
                placeholder="Enter city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permanent_state">State/Province</Label>
              <Input
                id="permanent_state"
                value={formData.permanent_state}
                onChange={(e) => handleChange('permanent_state', e.target.value)}
                className="input-glass"
                placeholder="Enter state"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permanent_country">Country</Label>
              <Input
                id="permanent_country"
                value={formData.permanent_country}
                onChange={(e) => handleChange('permanent_country', e.target.value)}
                className="input-glass"
                placeholder="Enter country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permanent_postal_code">Postal Code</Label>
              <Input
                id="permanent_postal_code"
                value={formData.permanent_postal_code}
                onChange={(e) => handleChange('permanent_postal_code', e.target.value)}
                className="input-glass"
                placeholder="Enter postal code"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmploymentInformation = () => (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="w-5 h-5 text-primary" />
          Employment Information
        </CardTitle>
        <CardDescription>Job details and organizational information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="department_id">Department</Label>
            <Select value={formData.department_id} onValueChange={(v) => handleChange('department_id', v)}>
              <SelectTrigger className="input-glass">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Select value={formData.branch_id} onValueChange={(v) => handleChange('branch_id', v)}>
              <SelectTrigger className="input-glass">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="designation">Job Title / Designation *</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
              className="input-glass"
              placeholder="Enter job title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee_grade">Employee Grade</Label>
            <Select value={formData.employee_grade} onValueChange={(v) => handleChange('employee_grade', v)}>
              <SelectTrigger className="input-glass">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L1">L1 - Entry Level</SelectItem>
                <SelectItem value="L2">L2 - Junior</SelectItem>
                <SelectItem value="L3">L3 - Mid Level</SelectItem>
                <SelectItem value="L4">L4 - Senior</SelectItem>
                <SelectItem value="L5">L5 - Lead</SelectItem>
                <SelectItem value="L6">L6 - Manager</SelectItem>
                <SelectItem value="L7">L7 - Director</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="employment_type">Employment Type</Label>
            <Select value={formData.employment_type} onValueChange={(v) => handleChange('employment_type', v)}>
              <SelectTrigger className="input-glass">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="joining_date">Joining Date *</Label>
            <Input
              id="joining_date"
              type="date"
              value={formData.joining_date}
              onChange={(e) => handleChange('joining_date', e.target.value)}
              className="input-glass"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="probation_end_date">Probation End Date</Label>
            <Input
              id="probation_end_date"
              type="date"
              value={formData.probation_end_date}
              onChange={(e) => handleChange('probation_end_date', e.target.value)}
              className="input-glass"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation_date">Confirmation Date</Label>
            <Input
              id="confirmation_date"
              type="date"
              value={formData.confirmation_date}
              onChange={(e) => handleChange('confirmation_date', e.target.value)}
              className="input-glass"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_location">Work Location</Label>
            <Input
              id="work_location"
              value={formData.work_location}
              onChange={(e) => handleChange('work_location', e.target.value)}
              className="input-glass"
              placeholder="Enter work location"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift_type">Shift Type</Label>
            <Select value={formData.shift_type} onValueChange={(v) => handleChange('shift_type', v)}>
              <SelectTrigger className="input-glass">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day Shift</SelectItem>
                <SelectItem value="night">Night Shift</SelectItem>
                <SelectItem value="rotational">Rotational</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger className="input-glass">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="probation">Probation</SelectItem>
                <SelectItem value="notice_period">Notice Period</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompensation = () => (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="w-5 h-5 text-primary" />
          Compensation & Banking
        </CardTitle>
        <CardDescription>Salary, banking, and tax information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Salary Information */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Salary Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Base Salary</Label>
              <Input
                id="salary"
                type="number"
                value={formData.salary}
                onChange={(e) => handleChange('salary', e.target.value)}
                className="input-glass"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay_frequency">Pay Frequency</Label>
              <Select value={formData.pay_frequency} onValueChange={(v) => handleChange('pay_frequency', v)}>
                <SelectTrigger className="input-glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Banking Information */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Banking Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                className="input-glass"
                placeholder="Enter bank name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account_number">Account Number</Label>
              <Input
                id="bank_account_number"
                value={formData.bank_account_number}
                onChange={(e) => handleChange('bank_account_number', e.target.value)}
                className="input-glass"
                placeholder="Enter account number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_ifsc">IFSC/Routing Code</Label>
              <Input
                id="bank_ifsc"
                value={formData.bank_ifsc}
                onChange={(e) => handleChange('bank_ifsc', e.target.value)}
                className="input-glass"
                placeholder="Enter IFSC/Routing code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pan_number">PAN/Tax ID</Label>
              <Input
                id="pan_number"
                value={formData.pan_number}
                onChange={(e) => handleChange('pan_number', e.target.value)}
                className="input-glass"
                placeholder="Enter PAN/Tax ID"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDocuments = () => {
    const idProofDocs = tempDocuments.filter(d => d.category === 'id_proof');
    const certificateDocs = tempDocuments.filter(d => d.category === 'certificates');
    const otherDocs = tempDocuments.filter(d => d.category === 'other');

    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Documents
          </CardTitle>
          <CardDescription>Upload required documents and download employee information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Upload Section */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Your Documents
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              You can upload your required documents and certificates here. {!isEditing && 'Documents will be saved when you create the employee record.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ID Proof Upload */}
              <div className="border border-dashed border-border/50 rounded-xl p-6 hover:border-primary/50 transition-colors group">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-blue-500/10 mb-3 group-hover:bg-blue-500/20 transition-colors">
                    <Shield className="w-6 h-6 text-blue-500" />
                  </div>
                  <h5 className="font-medium text-sm mb-1">Upload ID Proof</h5>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upload your ID proof for verification
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleTempDocumentUpload(e.target.files, 'id_proof')}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                      <Upload className="w-4 h-4" />
                      Choose File
                    </span>
                  </label>
                  {idProofDocs.length > 0 && (
                    <div className="mt-3 w-full space-y-2">
                      {idProofDocs.map((doc, idx) => {
                        const globalIdx = tempDocuments.findIndex(d => d === doc);
                        return (
                          <div key={idx} className="flex items-center justify-between bg-blue-500/10 rounded-lg px-3 py-2 text-xs">
                            <span className="truncate flex-1 text-left">{doc.file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeTempDocument(globalIdx)}
                              className="ml-2 text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Certificates Upload */}
              <div className="border border-dashed border-border/50 rounded-xl p-6 hover:border-primary/50 transition-colors group">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-emerald-500/10 mb-3 group-hover:bg-emerald-500/20 transition-colors">
                    <FileText className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h5 className="font-medium text-sm mb-1">Upload Certificates</h5>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upload educational and work certificates
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      multiple
                      onChange={(e) => handleTempDocumentUpload(e.target.files, 'certificates')}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                      <Upload className="w-4 h-4" />
                      Choose Files
                    </span>
                  </label>
                  {certificateDocs.length > 0 && (
                    <div className="mt-3 w-full space-y-2">
                      {certificateDocs.map((doc, idx) => {
                        const globalIdx = tempDocuments.findIndex(d => d === doc);
                        return (
                          <div key={idx} className="flex items-center justify-between bg-emerald-500/10 rounded-lg px-3 py-2 text-xs">
                            <span className="truncate flex-1 text-left">{doc.file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeTempDocument(globalIdx)}
                              className="ml-2 text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Other Documents Upload */}
              <div className="border border-dashed border-border/50 rounded-xl p-6 hover:border-primary/50 transition-colors group">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-amber-500/10 mb-3 group-hover:bg-amber-500/20 transition-colors">
                    <FileText className="w-6 h-6 text-amber-500" />
                  </div>
                  <h5 className="font-medium text-sm mb-1">Upload Other Documents</h5>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upload any additional employment documents
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      multiple
                      onChange={(e) => handleTempDocumentUpload(e.target.files, 'other')}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                      <Upload className="w-4 h-4" />
                      Choose Files
                    </span>
                  </label>
                  {otherDocs.length > 0 && (
                    <div className="mt-3 w-full space-y-2">
                      {otherDocs.map((doc, idx) => {
                        const globalIdx = tempDocuments.findIndex(d => d === doc);
                        return (
                          <div key={idx} className="flex items-center justify-between bg-amber-500/10 rounded-lg px-3 py-2 text-xs">
                            <span className="truncate flex-1 text-left">{doc.file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeTempDocument(globalIdx)}
                              className="ml-2 text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {tempDocuments.length > 0 && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {tempDocuments.length} document(s) pending upload. They will be saved when you {isEditing ? 'update' : 'create'} the employee.
                </p>
              </div>
            )}
          </div>

          {/* Download Section */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Download Documents
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Access your documents in various formats below:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PDF Download */}
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-red-500/20 mb-3">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                  <h5 className="font-medium text-sm mb-1">Employee Information</h5>
                  <p className="text-xs text-muted-foreground mb-4">
                    Get a detailed PDF version of your employee information
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 hover:bg-red-500/10 text-red-600"
                    disabled={!isEditing}
                  >
                    <ArrowRight className="w-4 h-4 mr-2 rotate-90" />
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Word Download */}
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-blue-500/20 mb-3">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <h5 className="font-medium text-sm mb-1">Employee Profile</h5>
                  <p className="text-xs text-muted-foreground mb-4">
                    Download your employee profile in editable Word format
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-500/30 hover:bg-blue-500/10 text-blue-600"
                    disabled={!isEditing}
                  >
                    <ArrowRight className="w-4 h-4 mr-2 rotate-90" />
                    Download Word
                  </Button>
                </div>
              </div>

              {/* PPT Download */}
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-orange-500/20 mb-3">
                    <FileText className="w-6 h-6 text-orange-500" />
                  </div>
                  <h5 className="font-medium text-sm mb-1">Employee Presentation</h5>
                  <p className="text-xs text-muted-foreground mb-4">
                    Access the PowerPoint with professional details
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-500/30 hover:bg-orange-500/10 text-orange-600"
                    disabled={!isEditing}
                  >
                    <ArrowRight className="w-4 h-4 mr-2 rotate-90" />
                    Download PPT
                  </Button>
                </div>
              </div>
            </div>

            {!isEditing && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Download options will be available after saving the employee record.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLeaveAttendance = () => (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-primary" />
          Leave & Attendance Settings
        </CardTitle>
        <CardDescription>Emergency contact and leave configuration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Emergency Contact */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Emergency Contact</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Contact Name</Label>
              <Input
                id="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                className="input-glass"
                placeholder="Enter contact name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                className="input-glass"
                placeholder="Enter contact phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_relation">Relationship</Label>
              <Select value={formData.emergency_contact_relation} onValueChange={(v) => handleChange('emergency_contact_relation', v)}>
                <SelectTrigger className="input-glass">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_address">Contact Address</Label>
              <Input
                id="emergency_contact_address"
                value={formData.emergency_contact_address}
                onChange={(e) => handleChange('emergency_contact_address', e.target.value)}
                className="input-glass"
                placeholder="Enter contact address"
              />
            </div>
          </div>
        </div>

        {/* Leave Settings Placeholder */}
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Leave Settings Coming Soon</p>
          <p className="text-sm mt-1">Configure leave balances and attendance policies here.</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderReviewSubmit = () => (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="w-5 h-5 text-primary" />
          Review & Submit
        </CardTitle>
        <CardDescription>Review all information before submitting</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Personal */}
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Personal
                <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => goToStep(0)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Code:</span> {formData.employee_code}</p>
              <p><span className="text-muted-foreground">Name:</span> {formData.full_name || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Gender:</span> {formData.gender || 'Not specified'}</p>
              <p><span className="text-muted-foreground">DOB:</span> {formData.date_of_birth || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Nationality:</span> {formData.nationality || 'Not specified'}</p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Contact
                <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => goToStep(1)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Email:</span> {formData.email || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Phone:</span> {formData.phone || 'Not specified'}</p>
              <p><span className="text-muted-foreground">City:</span> {formData.city || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Country:</span> {formData.country || 'Not specified'}</p>
            </CardContent>
          </Card>

          {/* Employment */}
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Employment
                <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => goToStep(2)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Department:</span> {departments.find(d => d.id === formData.department_id)?.name || 'Not assigned'}</p>
              <p><span className="text-muted-foreground">Designation:</span> {formData.designation || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Type:</span> {formData.employment_type?.replace('_', ' ')}</p>
              <p><span className="text-muted-foreground">Status:</span> {formData.status}</p>
              <p><span className="text-muted-foreground">Joining:</span> {formData.joining_date}</p>
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Compensation
                <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => goToStep(3)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Salary:</span> {formData.salary ? `$${parseFloat(formData.salary).toLocaleString()}` : 'Not specified'}</p>
              <p><span className="text-muted-foreground">Frequency:</span> {formData.pay_frequency}</p>
              <p><span className="text-muted-foreground">Bank:</span> {formData.bank_name || 'Not specified'}</p>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Emergency Contact
                <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => goToStep(5)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Name:</span> {formData.emergency_contact_name || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Phone:</span> {formData.emergency_contact_phone || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Relation:</span> {formData.emergency_contact_relation || 'Not specified'}</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderPersonalInformation();
      case 1: return renderContactInformation();
      case 2: return renderEmploymentInformation();
      case 3: return renderCompensation();
      case 4: return renderDocuments();
      case 5: return renderLeaveAttendance();
      case 6: return renderReviewSubmit();
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/employees')}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                {isEditing ? 'Edit Employee' : 'Add New Employee'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditing ? 'Update employee information' : 'Enter employee details to add them to the system'}
              </p>
            </div>
          </div>
          {!isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={saveDraft}>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* Stepper */}
        <FormStepper
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={goToStep}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step Content with Transition */}
          <div
            ref={contentRef}
            className={cn(
              "transition-all duration-300 ease-out",
              isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
            )}
          >
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? () => navigate('/employees') : prevStep}
              className="min-w-[120px]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </Button>

            <div className="flex gap-2">
              {currentStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  disabled={loading}
                  className="min-w-[160px] bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isEditing ? 'Update Employee' : 'Save Employee'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="min-w-[120px] bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
