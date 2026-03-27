import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Presentation,
  FileType,
  Download,
  Upload,
  Trash2,
  Loader2,
  File,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_name: string;
  document_type: string;
  document_category: string;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

interface EmployeeDocumentsProps {
  employeeId: string;
  employeeName: string;
  isOpen: boolean;
  onClose: () => void;
}

const documentCategories = [
  { id: 'identity', label: 'Identity & Legal', icon: FileText, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', description: 'ID Cards, Passports, Visas' },
  { id: 'qualification', label: 'Qualifications', icon: FileType, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', description: 'Degrees, Certifications' },
  { id: 'medical', label: 'Medical & Health', icon: FileText, color: 'text-rose-500', bgColor: 'bg-rose-500/10', description: 'Vaccination, Health Check' },
  { id: 'hr_records', label: 'HR Records', icon: File, color: 'text-amber-500', bgColor: 'bg-amber-500/10', description: 'Contracts, Appraisal Scans' },
];

const acceptedTypes = {
  pdf: { accept: '.pdf', mime: 'application/pdf', label: 'PDF', icon: FileText, color: 'text-red-500' },
  ppt: { accept: '.ppt,.pptx', mime: 'application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PowerPoint', icon: Presentation, color: 'text-orange-500' },
  word: { accept: '.doc,.docx', mime: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word', icon: FileType, color: 'text-blue-500' },
};

export function EmployeeDocuments({ employeeId, employeeName, isOpen, onClose }: EmployeeDocumentsProps) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchDocuments();
    }
  }, [isOpen, employeeId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentType = (mimeType: string | null): string => {
    if (!mimeType) return 'unknown';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'ppt';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
    return 'unknown';
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpload = async (category: string, docType: string, file: File) => {
    const uploadKey = `${category}-${docType}`;
    setUploading(uploadKey);

    try {
      // 1. Check for Bucket Existence / Create if missing (Best effort for admin/dev flow, though normally done in SQL)
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketName = 'employee-documents';
      const bucketExists = buckets?.find(b => b.name === bucketName);

      if (!bucketExists) {
        // Attempt to create (will likely fail if RLS/Permissions restrict, but worth a shot or specific error)
        // For a public/demo app, we might just stop and warn.
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: Object.values(acceptedTypes).map(t => t.mime.split(',')).flat()
        });

        if (createError) {
          console.error('Bucket missing and creation failed:', createError);
          throw new Error("System storage is not configured. Please contact IT.");
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/${category}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, file);

      if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
          throw new Error("Storage bucket not initialized. Please run database setup.");
        }
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName);

      // Save document record
      const { error: dbError } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          document_name: file.name,
          document_type: docType,
          document_category: category,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });

      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document. Please check storage configuration.',
        variant: 'destructive',
      });
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (category: string, docType: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(category, docType, file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDownload = (doc: EmployeeDocument) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  const handleDelete = async (doc: EmployeeDocument) => {
    setDeleting(doc.id);
    try {
      // Extract file path from URL
      if (doc.file_url) {
        const urlParts = doc.file_url.split('/employee-documents/');
        if (urlParts[1]) {
          await supabase.storage
            .from('employee-documents')
            .remove([urlParts[1]]);
        }
      }

      // Delete record
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });

      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const getDocumentsForCategory = (category: string) => {
    return documents.filter(d => d.document_category === category);
  };

  const getIcon = (docType: string) => {
    const type = acceptedTypes[docType as keyof typeof acceptedTypes];
    return type?.icon || File;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Employee Documents
          </DialogTitle>
          <DialogDescription>
            Manage documents for <span className="font-semibold text-foreground">{employeeName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Download Section */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Manage and Organize Employee Documents (PDF Preferred)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {documentCategories.map(category => {
                const categoryDocs = getDocumentsForCategory(category.id);
                const CategoryIcon = category.icon;

                return (
                  <Card key={category.id} className="glass-card border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${category.bgColor}`}>
                          <CategoryIcon className={`w-5 h-5 ${category.color}`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{category.label}</h4>
                          <p className="text-[10px] text-muted-foreground mb-1">{category.description}</p>
                          <p className="text-[10px] font-semibold text-primary/70">
                            {categoryDocs.length} file{categoryDocs.length !== 1 ? 's' : ''} uploaded
                          </p>
                        </div>
                      </div>

                      {loading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : categoryDocs.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No documents uploaded
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {categoryDocs.map(doc => {
                            const docType = getDocumentType(doc.mime_type);
                            const TypeIcon = getIcon(docType);

                            return (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 group"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <TypeIcon className={`w-4 h-4 flex-shrink-0 ${acceptedTypes[docType as keyof typeof acceptedTypes]?.color || 'text-muted-foreground'}`} />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">{doc.document_name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {formatFileSize(doc.file_size)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDownload(doc)}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(doc)}
                                    disabled={deleting === doc.id}
                                  >
                                    {deleting === doc.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Upload Section */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Upload Employee Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {documentCategories.map(category => {
                const CategoryIcon = category.icon;

                return (
                  <Card key={category.id} className="glass-card border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${category.bgColor}`}>
                          <CategoryIcon className={`w-5 h-5 ${category.color}`} />
                        </div>
                        <h4 className="font-medium text-sm">{category.label}</h4>
                      </div>

                      <div className="space-y-2">
                        {Object.entries(acceptedTypes).map(([type, config]) => {
                          const uploadKey = `${category.id}-${type}`;
                          const isUploading = uploading === uploadKey;
                          const TypeIcon = config.icon;

                          return (
                            <div key={type}>
                              <input
                                type="file"
                                ref={(el) => fileInputRefs.current[uploadKey] = el}
                                accept={config.accept}
                                onChange={handleFileSelect(category.id, type)}
                                className="hidden"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2"
                                onClick={() => fileInputRefs.current[uploadKey]?.click()}
                                disabled={isUploading}
                              >
                                {isUploading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                <TypeIcon className={`w-4 h-4 ${config.color}`} />
                                <span className="text-xs">Upload {config.label}</span>
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Uploads */}
          {documents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Recent Uploads
              </h3>
              <div className="space-y-2">
                {documents.slice(0, 5).map(doc => {
                  const docType = getDocumentType(doc.mime_type);
                  const TypeIcon = getIcon(docType);
                  const category = documentCategories.find(c => c.id === doc.document_category);

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <TypeIcon className={`w-5 h-5 ${acceptedTypes[docType as keyof typeof acceptedTypes]?.color || 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-sm font-medium">{doc.document_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>•</span>
                            <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                            {category && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {category.label}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id}
                        >
                          {deleting === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}