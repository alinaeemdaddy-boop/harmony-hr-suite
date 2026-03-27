import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    FileText,
    MapPin,
    Calendar,
    Calculator,
    Loader2,
    CheckCircle2,
    Clock,
    XCircle,
    TrendingUp,
    Map,
    Truck,
    Edit3
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DestinationDialog } from './DestinationDialog';
import { ClaimAllowanceDialog } from './ClaimAllowanceDialog';

interface AllowanceRate {
    location: string;
    staff_level: string;
    travel_rate: number;
    daily_allowance_rate: number;
    meal_allowance_rate: number;
    incentive_rate: number;
}

interface ClaimFormData {
    claim_date: string;
    location: string;
    reason: string;
    travel_amount: number;
    daily_allowance: number;
    meal_allowance: number;
    incentive_amount: number;
}

export function AllowanceClaimForm({ employeeId, isAdmin }: { employeeId?: string; isAdmin?: boolean }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [rates, setRates] = useState<AllowanceRate[]>([]);
    const [staffLevel, setStaffLevel] = useState<string>('junior');
    const [claims, setClaims] = useState<any[]>([]);

    const [formData, setFormData] = useState<ClaimFormData>({
        claim_date: format(new Date(), 'yyyy-MM-dd'),
        location: '',
        reason: '',
        travel_amount: 0,
        daily_allowance: 0,
        meal_allowance: 0,
        incentive_amount: 0,
    });

    useEffect(() => {
        if (employeeId) {
            fetchStaffLevel();
            fetchClaims();
        }
        fetchRates();
    }, [employeeId]);

    const fetchStaffLevel = async () => {
        const { data } = await (supabase as any)
            .from('employees')
            .select('staff_level')
            .eq('id', employeeId)
            .maybeSingle();
        if (data?.staff_level) setStaffLevel(data.staff_level);
    };

    const fetchRates = async () => {
        const { data } = await (supabase as any).from('allowance_rates').select('*');
        if (data) {
            setRates(data);
            if (!formData.location && data.length > 0) {
                setFormData(prev => ({ ...prev, location: data[0].location }));
            }
        }
    };

    const fetchClaims = async () => {
        setLoading(true);
        const { data } = await (supabase as any)
            .from('allowance_claims')
            .select('*')
            .eq('employee_id', employeeId)
            .order('claim_date', { ascending: false });
        if (data) setClaims(data);
        setLoading(false);
    };

    const currentRate = rates.find(r => r.location === formData.location && r.staff_level === staffLevel);

    useEffect(() => {
        if (currentRate) {
            setFormData(prev => ({
                ...prev,
                travel_amount: currentRate.travel_rate,
                daily_allowance: currentRate.daily_allowance_rate,
                meal_allowance: currentRate.meal_allowance_rate,
                incentive_amount: currentRate.incentive_rate,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                travel_amount: 0,
                daily_allowance: 0,
                meal_allowance: 0,
                incentive_amount: 0,
            }));
        }
    }, [currentRate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employeeId || !currentRate) return;

        setSubmitting(true);
        try {
            const { error } = await (supabase as any).from('allowance_claims').insert({
                employee_id: employeeId,
                claim_date: formData.claim_date,
                location: formData.location,
                staff_level: staffLevel,
                travel_amount: formData.travel_amount,
                daily_allowance: formData.daily_allowance,
                meal_allowance: formData.meal_allowance,
                incentive_amount: formData.incentive_amount,
                reason: formData.reason,
                status: 'pending'
            });

            if (error) throw error;

            toast({
                title: 'Claim Submitted',
                description: 'Your TA/DA claim has been sent for approval.',
            });

            setFormData({ ...formData, reason: '' });
            fetchClaims();
        } catch (error: any) {
            toast({
                title: 'Submission Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Claim Submission */}
                <Card className="glass-card shadow-2xl border-primary/5">
                    <CardHeader className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                                <Truck className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold">New TA/DA Claim</CardTitle>
                                <CardDescription>Submit travel and daily allowance requests</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="date" className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" /> Travel Date
                                    </Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.claim_date}
                                        onChange={(e) => setFormData({ ...formData, claim_date: e.target.value })}
                                        className="bg-muted/30 border-primary/10 focus:border-primary/40 h-11"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="location" className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-primary" /> Destination
                                        </Label>
                                        <DestinationDialog onSuccess={fetchRates} />
                                    </div>
                                    <Select
                                        value={formData.location}
                                        onValueChange={(v: any) => setFormData({ ...formData, location: v })}
                                    >
                                        <SelectTrigger id="location" className="bg-muted/30 border-primary/10 h-11">
                                            <SelectValue placeholder="Select location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from(new Set(rates.map(r => r.location))).map((loc) => (
                                                <SelectItem key={loc} value={loc}>
                                                    {loc}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reason" className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" /> Reason / Trip Details
                                </Label>
                                <Textarea
                                    id="reason"
                                    placeholder="Visit to client site / Branch audit / Cargo handling..."
                                    className="bg-muted/30 border-primary/10 focus:border-primary/40 min-h-[100px]"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Rate Preview Card */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border border-primary/20 shadow-inner">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold flex items-center gap-2 text-primary">
                                        <Calculator className="w-4 h-4" /> Estimated Allowance ({staffLevel})
                                    </h4>
                                    <ClaimAllowanceDialog
                                        staffLevel={staffLevel}
                                        values={{
                                            travel_amount: formData.travel_amount,
                                            daily_allowance: formData.daily_allowance,
                                            meal_allowance: formData.meal_allowance,
                                            incentive_amount: formData.incentive_amount,
                                        }}
                                        onSave={(vals) => setFormData(prev => ({ ...prev, ...vals }))}
                                        trigger={
                                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/5 gap-1.5 font-bold">
                                                <Edit3 className="w-3.5 h-3.5" />
                                                {formData.travel_amount === 0 && formData.meal_allowance === 0 ? "Add Allowance" : "Adjust"}
                                            </Button>
                                        }
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-muted-foreground">Travel Rate:</span>
                                        <span className="font-semibold">{formatCurrency(formData.travel_amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-muted-foreground">Daily Allowance:</span>
                                        <span className="font-semibold">{formatCurrency(formData.daily_allowance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-muted-foreground">Meal Allowance:</span>
                                        <span className="font-semibold">{formatCurrency(formData.meal_allowance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-muted-foreground">Incentive:</span>
                                        <span className="font-semibold">{formatCurrency(formData.incentive_amount)}</span>
                                    </div>
                                    <div className="col-span-2 pt-3 mt-2 border-t border-primary/10 flex justify-between items-center">
                                        <span className="font-bold text-foreground">Total Claim Amount:</span>
                                        <span className="text-xl font-black text-primary">
                                            {formatCurrency(
                                                formData.travel_amount +
                                                formData.daily_allowance +
                                                formData.meal_allowance +
                                                formData.incentive_amount
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full text-lg h-12 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all font-bold"
                                disabled={submitting || (formData.travel_amount === 0 && formData.meal_allowance === 0 && formData.reason === '')}
                            >
                                {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                                Submit TA/DA Claim
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <div className="space-y-6">
                    <Card className="glass-card shadow-xl border-accent/5 overflow-hidden">
                        <div className="p-1 bg-gradient-to-r from-primary/40 to-accent/40" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-accent" />
                                Allowance Policy
                            </CardTitle>
                            <CardDescription>Rules for managerial and junior staff</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-sm">
                                <p className="leading-relaxed text-muted-foreground">
                                    Allowances are automatically calculated based on your <strong>Designation</strong> and the <strong>Branch Location</strong> of travel.
                                </p>
                                <ul className="list-disc list-inside mt-3 space-y-2 text-foreground/80">
                                    <li>Managerial staff receive premium meal and travel rates.</li>
                                    <li>LHR (Lahore) has the highest cost-of-living allowance adjustment.</li>
                                    <li>Payments are processed in the next monthly payroll run.</li>
                                </ul>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center">
                                    <p className="text-xs text-success font-bold uppercase tracking-wider mb-1">Approved</p>
                                    <p className="text-2xl font-black text-success">
                                        {claims.filter(c => c.status === 'approved').length}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 text-center">
                                    <p className="text-xs text-warning font-bold uppercase tracking-wider mb-1">Pending</p>
                                    <p className="text-2xl font-black text-warning">
                                        {claims.filter(c => c.status === 'pending').length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Claim History */}
            <Card className="glass-card shadow-2xl border-primary/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Recent Claims History</CardTitle>
                            <CardDescription>Status tracking for your recent allowance requests</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 p-2 px-3">
                            Total Claims: {claims.length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-bold">Date</TableHead>
                                    <TableHead className="font-bold">Location</TableHead>
                                    <TableHead className="font-bold">Reason</TableHead>
                                    <TableHead className="font-bold text-right">Total Amount</TableHead>
                                    <TableHead className="font-bold text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" />
                                        </TableCell>
                                    </TableRow>
                                ) : claims.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                                            No claims found. Submit your first request above!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    claims.map((claim) => (
                                        <TableRow key={claim.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="font-medium">
                                                {format(new Date(claim.claim_date), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-muted/50">
                                                    {claim.location}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate">{claim.reason}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                                {formatCurrency(claim.total_amount)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center">
                                                    {claim.status === 'approved' && (
                                                        <Badge className="bg-success/15 text-success border-success/20 gap-1 px-2 py-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Approved
                                                        </Badge>
                                                    )}
                                                    {claim.status === 'pending' && (
                                                        <Badge className="bg-warning/15 text-warning border-warning/20 gap-1 px-2 py-1">
                                                            <Clock className="w-3 h-3" /> Pending
                                                        </Badge>
                                                    )}
                                                    {claim.status === 'rejected' && (
                                                        <Badge className="bg-destructive/15 text-destructive border-destructive/20 gap-1 px-2 py-1">
                                                            <XCircle className="w-3 h-3" /> Rejected
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
