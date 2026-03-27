import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { FileText, Plus, Download, Calendar, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { exportContractToPDF, exportExperienceLetterToPDF } from '@/lib/exportUtils';

interface Contract {
    id: string;
    employee_id: string;
    contract_type: 'employment_contract' | 'mou' | 'experience_certificate';
    start_date: string;
    end_date: string | null;
    status: 'active' | 'expired' | 'terminated' | 'renewed' | 'completed';
    salary_basis: number | null;
    file_url: string | null;
}

interface ContractManagerProps {
    employeeId: string;
    employeeName: string;
}

export function ContractManager({ employeeId, employeeName }: ContractManagerProps) {
    const { toast } = useToast();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        contract_type: 'employment_contract' as 'employment_contract' | 'mou' | 'experience_certificate',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: '',
        salary_basis: '',
    });

    useEffect(() => {
        fetchContracts();
    }, [employeeId]);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('employee_contracts')
                .select('*')
                .eq('employee_id', employeeId)
                .order('start_date', { ascending: false });

            if (error) throw error;
            setContracts(data || []);
        } catch (error: any) {
            console.error('Error fetching contracts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddContract = async () => {
        setSaving(true);
        try {
            const { error } = await (supabase as any).from('employee_contracts').insert({
                employee_id: employeeId,
                contract_type: formData.contract_type,
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                salary_basis: formData.salary_basis ? parseFloat(formData.salary_basis) : null,
                status: 'active',
            });

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'Contract generated and saved successfully',
            });
            setIsDialogOpen(false);
            fetchContracts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save contract',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">Active</Badge>;
            case 'expired':
                return <Badge variant="destructive">Expired</Badge>;
            case 'renewed':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">Renewed</Badge>;
            case 'completed':
                return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">Completed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleExport = async (contract: Contract) => {
        if (contract.contract_type === 'experience_certificate') {
            try {
                // Fetch more employee details for experience letter
                const { data: empData, error } = await supabase.from('employees').select('*').eq('id', employeeId).single();
                if (error || !empData) {
                    toast({
                        title: 'Data Fetch Failed',
                        description: 'Could not retrieve full employee details for the experience letter.',
                        variant: 'destructive',
                    });
                    return;
                }
                exportExperienceLetterToPDF(employeeName, {
                    ...empData,
                    start_date: contract.start_date,
                    end_date: contract.end_date
                });
            } catch (err) {
                console.error('Experience Letter Export Error:', err);
            }
        } else {
            exportContractToPDF(employeeName, contract);
        }
    };

    return (
        <Card className="glass-card border-0">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        Contracts & MOUs
                    </CardTitle>
                    <CardDescription>Manage employment agreements and memorandums</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Generate New
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Generate Contract / MOU</DialogTitle>
                            <DialogDescription>
                                Create a system-generated document for {employeeName}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="type">Document Type</Label>
                                <Select
                                    value={formData.contract_type}
                                    onValueChange={(v: any) => setFormData({ ...formData, contract_type: v })}
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employment_contract">Employment Contract</SelectItem>
                                        <SelectItem value="mou">Memorandum of Understanding (MOU)</SelectItem>
                                        <SelectItem value="experience_certificate">Experience Certificate</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="start">Start Date</Label>
                                    <Input
                                        id="start"
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="end">End Date (Optional)</Label>
                                    <Input
                                        id="end"
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="salary">Agreed Salary Basis</Label>
                                <Input
                                    id="salary"
                                    type="number"
                                    placeholder="e.g. 50000"
                                    value={formData.salary_basis}
                                    onChange={(e) => setFormData({ ...formData, salary_basis: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddContract} disabled={saving}>
                                {saving ? 'Generating...' : 'Generate & Save'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-8"><Clock className="w-6 h-6 animate-spin text-primary" /></div>
                ) : contracts.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border/50">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                        <p className="text-muted-foreground">No contracts or MOUs found for this employee.</p>
                        <Button variant="link" onClick={() => setIsDialogOpen(true)} className="mt-2">
                            Generate the first agreement
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Salary Basis</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract) => (
                                    <TableRow key={contract.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                {contract.contract_type === 'employment_contract' && 'Employment Contract'}
                                                {contract.contract_type === 'mou' && 'MOU'}
                                                {contract.contract_type === 'experience_certificate' && 'Experience Certificate'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(contract.start_date), 'MMM d, yyyy')}
                                                    {contract.end_date ? ` to ${format(new Date(contract.end_date), 'MMM d, yyyy')}` : ' (Indefinite)'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {contract.salary_basis ? `Rs. ${contract.salary_basis.toLocaleString()}` : 'N/A'}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => handleExport(contract)}
                                            >
                                                <Download className="w-4 h-4" />
                                                Export
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
    );
}
