import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    Calculator,
    User,
    Calendar,
    PlusCircle,
    MinusCircle,
    DollarSign,
    Save,
    TrendingUp,
    TrendingDown,
    Info,
    AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ManualPayslipDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    initialData?: any;
}

export function ManualPayslipDialog({ open, onOpenChange, onSuccess, initialData }: ManualPayslipDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [periods, setPeriods] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        employee_id: '',
        period_id: '',
        basic_salary: 0,
        allowances: 0,
        bonus_amount: 0,
        tax_amount: 0,
        provident_fund: 0,
        eobi_amount: 0,
        loan_deduction: 0,
        advance_deduction: 0,
        other_deductions: 0,
        overtime_amount: 0,
        leave_deduction: 0,
        late_deduction: 0,
    });

    useEffect(() => {
        fetchEmployees();
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData({
                employee_id: initialData.employee_id,
                period_id: initialData.period_id,
                basic_salary: initialData.basic_salary || 0,
                allowances: initialData.allowances || 0,
                bonus_amount: initialData.bonus_amount || 0,
                tax_amount: initialData.tax_amount || 0,
                provident_fund: initialData.provident_fund || 0,
                eobi_amount: initialData.eobi_amount || 0,
                loan_deduction: initialData.loan_deduction || 0,
                advance_deduction: initialData.advance_deduction || 0,
                other_deductions: initialData.other_deductions || 0,
                overtime_amount: initialData.overtime_amount || 0,
                leave_deduction: initialData.leave_deduction || 0,
                late_deduction: initialData.late_deduction || 0,
            });
        } else {
            setFormData({
                employee_id: '',
                period_id: '',
                basic_salary: 0,
                allowances: 0,
                bonus_amount: 0,
                tax_amount: 0,
                provident_fund: 0,
                eobi_amount: 0,
                loan_deduction: 0,
                advance_deduction: 0,
                other_deductions: 0,
                overtime_amount: 0,
                leave_deduction: 0,
                late_deduction: 0,
            });
        }
    }, [initialData, open]);

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('id, full_name, employee_code')
            .eq('status', 'active');
        setEmployees(data || []);
    };

    const fetchPeriods = async () => {
        const { data } = await supabase
            .from('payroll_periods')
            .select('id, name')
            .order('start_date', { ascending: false });
        setPeriods(data || []);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: parseFloat(value) || 0
        }));
    };

    const calculateGross = () => {
        return (formData.basic_salary || 0) +
            (formData.allowances || 0) +
            (formData.overtime_amount || 0) +
            (formData.bonus_amount || 0);
    };

    const calculateDeductions = () => {
        return (
            (formData.tax_amount || 0) +
            (formData.provident_fund || 0) +
            (formData.eobi_amount || 0) +
            (formData.loan_deduction || 0) +
            (formData.advance_deduction || 0) +
            (formData.leave_deduction || 0) +
            (formData.late_deduction || 0) +
            (formData.other_deductions || 0)
        );
    };

    const calculateNet = () => {
        return calculateGross() - calculateDeductions();
    };

    const handleSubmit = async () => {
        if (!formData.employee_id || !formData.period_id) {
            toast({
                title: 'Missing Required Fields',
                description: 'Please select an employee and a payroll period.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);

        const payslipData: any = {
            employee_id: formData.employee_id,
            period_id: formData.period_id,
            payroll_run_id: formData.period_id,
            basic_salary: formData.basic_salary,
            total_allowances: formData.allowances,
            bonus_amount: formData.bonus_amount,
            overtime_amount: formData.overtime_amount,
            gross_earnings: calculateGross(),
            tax_amount: formData.tax_amount,
            provident_fund: formData.provident_fund,
            eobi_amount: formData.eobi_amount,
            loan_deduction: formData.loan_deduction,
            advance_deduction: formData.advance_deduction,
            leave_deduction: formData.leave_deduction,
            late_deduction: formData.late_deduction,
            other_deductions: formData.other_deductions,
            total_deductions: calculateDeductions(),
            net_salary: calculateNet(),
            status: 'generated',
        };

        let result;
        if (initialData?.id) {
            result = await supabase
                .from('payslips')
                .update(payslipData)
                .eq('id', initialData.id);
        } else {
            result = await supabase
                .from('payslips')
                .insert([payslipData]);
        }

        if (result.error) {
            console.error(result.error);
            toast({
                title: 'Error',
                description: result.error.message || 'Failed to save payslip. Please try again.',
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Success!',
                description: `Manual payslip has been ${initialData ? 'updated' : 'created'} successfully.`,
            });
            onSuccess?.();
            onOpenChange(false);
        }

        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white rounded-t-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                                <Calculator className="w-8 h-8 text-primary-foreground" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">
                                    {initialData ? 'Edit Salary Statement' : 'Create Manual Payslip'}
                                </DialogTitle>
                                <DialogDescription className="text-slate-300">
                                    Enter detailed salary components for formal record keeping.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8 bg-white">
                    {/* Primary Info */}
                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <User className="w-3.5 h-3.5" /> Select Employee
                            </Label>
                            <Select
                                value={formData.employee_id}
                                onValueChange={(v) => setFormData({ ...formData, employee_id: v })}
                                disabled={!!initialData}
                            >
                                <SelectTrigger className="bg-white border-slate-200">
                                    <SelectValue placeholder="Choose an employee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{e.full_name}</span>
                                                <Badge variant="outline" className="text-[10px] font-mono px-1 h-4">{e.employee_code}</Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> Payroll Period
                            </Label>
                            <Select
                                value={formData.period_id}
                                onValueChange={(v) => setFormData({ ...formData, period_id: v })}
                                disabled={!!initialData}
                            >
                                <SelectTrigger className="bg-white border-slate-200">
                                    <SelectValue placeholder="Select pay month..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {periods.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12">
                        {/* Earnings Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                                <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> EARNINGS
                                </h3>
                                <PlusCircle className="w-4 h-4 text-emerald-500 opacity-50" />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600">Basic Salary</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input type="number" className="pl-9 bg-emerald-50/20 border-emerald-100" value={formData.basic_salary} onChange={e => handleInputChange('basic_salary', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600">Total Allowances</Label>
                                    <div className="relative">
                                        <PlusCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input type="number" className="pl-9 bg-emerald-50/20 border-emerald-100" value={formData.allowances} onChange={e => handleInputChange('allowances', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600">Overtime Pay</Label>
                                    <div className="relative">
                                        <PlusCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input type="number" className="pl-9 bg-emerald-50/20 border-emerald-100" value={formData.overtime_amount} onChange={e => handleInputChange('overtime_amount', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600">Performance Bonus</Label>
                                    <div className="relative">
                                        <PlusCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input type="number" className="pl-9 bg-emerald-50/20 border-emerald-100" value={formData.bonus_amount} onChange={e => handleInputChange('bonus_amount', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deductions Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                                <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4" /> DEDUCTIONS
                                </h3>
                                <MinusCircle className="w-4 h-4 text-rose-500 opacity-50" />
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Income Tax</Label>
                                        <Input type="number" className="bg-rose-50/20 border-rose-100" value={formData.tax_amount} onChange={e => handleInputChange('tax_amount', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">EOBI Contribution</Label>
                                        <Input type="number" className="bg-rose-50/20 border-rose-100" value={formData.eobi_amount} onChange={e => handleInputChange('eobi_amount', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Provident Fund</Label>
                                        <Input type="number" className="bg-rose-50/20 border-rose-100" value={formData.provident_fund} onChange={e => handleInputChange('provident_fund', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Loan Installment</Label>
                                        <Input type="number" className="bg-rose-50/20 border-rose-100" value={formData.loan_deduction} onChange={e => handleInputChange('loan_deduction', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Unpaid Leaves</Label>
                                        <Input type="number" className="bg-rose-50/20 border-rose-100" value={formData.leave_deduction} onChange={e => handleInputChange('leave_deduction', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Late Adjustments</Label>
                                        <Input type="number" className="bg-rose-50/20 border-rose-100" value={formData.late_deduction} onChange={e => handleInputChange('late_deduction', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Other Deductions</Label>
                                    <Input type="number" className="bg-rose-50/20 border-rose-100" value={formData.other_deductions} onChange={e => handleInputChange('other_deductions', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl transform transition-all hover:scale-[1.01]">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5" /> Calculation Summary
                                </p>
                                <div className="flex flex-col">
                                    <p className="text-4xl font-display font-bold">
                                        {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(calculateNet())}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Final Take-home Salary</p>
                                </div>
                            </div>
                            <div className="text-right space-y-3">
                                <div className="flex flex-col items-end gap-1">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">+ {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(calculateGross())} Gross</p>
                                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">- {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(calculateDeductions())} Deductions</p>
                                </div>
                                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/10 px-4 py-1.5 text-sm font-bold backdrop-blur-md">
                                    {calculateNet() < 0 ? (
                                        <div className="flex items-center gap-2 text-rose-400">
                                            <AlertCircle className="w-4 h-4" /> NEGATIVE PAY!
                                        </div>
                                    ) : 'VALID SALARY'}
                                </Badge>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
                    </div>
                </div>

                <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 rounded-b-lg">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-slate-500 hover:text-slate-900 font-bold tracking-tight"
                    >
                        DISCARD CHANGES
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 rounded-xl font-bold tracking-tight shadow-lg shadow-slate-200 transition-all active:scale-95 flex gap-2"
                    >
                        {loading ? 'PROCESSING...' : (
                            <>
                                <Save className="w-4 h-4" />
                                {initialData ? 'UPDATE PAYSLIP' : 'CONFIRM & SAVE'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
