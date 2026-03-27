
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, RefreshCw, Info } from 'lucide-react';
import { fetchActiveTaxSlabs, calculateAnnualTax, TaxSlab } from '@/lib/payrollUtils';

export function SalaryTaxCalculator() {
    const [loading, setLoading] = useState(false);
    const [slabs, setSlabs] = useState<TaxSlab[]>([]);
    const [monthlySalary, setMonthlySalary] = useState<string>('');
    const [medicalAllowance, setMedicalAllowance] = useState<string>(''); // Often 10% of Basic is exempt
    const [otherDeductions, setOtherDeductions] = useState<string>('');

    const [result, setResult] = useState<{
        annualGross: number;
        annualTaxable: number;
        annualTax: number;
        monthlyTax: number;
        monthlyNet: number;
        effectiveRate: number;
    } | null>(null);

    useEffect(() => {
        loadSlabs();
    }, []);

    const loadSlabs = async () => {
        setLoading(true);
        const data = await fetchActiveTaxSlabs();
        setSlabs(data);
        setLoading(false);
    };

    const calculate = () => {
        const salary = parseFloat(monthlySalary) || 0;
        const medical = parseFloat(medicalAllowance) || 0;
        const deductions = parseFloat(otherDeductions) || 0; // Exemptions like donations

        if (salary <= 0) return;

        // Annual Gross
        const annualGross = salary * 12;

        // Medical Exemption Logic (simplified: assume input medical is the allowance amount)
        // FBR Rule (General): Medical allowance up to 10% of Basic Salary is exempt if free medical facility is not provided.
        // Since we only have "Salary", let's assume input Salary includes everything.
        // If the user breaks it down, we could be more precise.
        // user request: "Allowances like medical and house rent are considered when calculating tax-free income"
        // For simplicity in this standalone calculator, we'll treat 'medical' input as the EXEMPT portion or allow user to specify exempt amount.
        // Let's assume the user enters the annual exempt amount or monthly exempt amount. Let's say Monthly Exempt Medical.

        // Taxable Income = Annual Gross - (Monthly Deductions * 12)
        // Note: Deductions here refer to tax exemptions (like Zakat, Donations, etc.)
        const annualExempt = (deductions * 12) + (medical * 12);
        const annualTaxable = Math.max(0, annualGross - annualExempt);

        const annualTax = calculateAnnualTax(annualTaxable, slabs);
        const monthlyTax = annualTax / 12;
        const monthlyNet = salary - monthlyTax;

        setResult({
            annualGross,
            annualTaxable,
            annualTax,
            monthlyTax,
            monthlyNet,
            effectiveRate: annualGross > 0 ? (annualTax / annualGross) * 100 : 0
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            <Card className="glass-card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Calculator className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Salary Tax Calculator</CardTitle>
                            <CardDescription>Estimate monthly tax based on FBR slabs</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Monthly Gross Salary (PKR)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 150000"
                            value={monthlySalary}
                            onChange={(e) => setMonthlySalary(e.target.value)}
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Monthly Medical Exemption (PKR)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Exempt amount"
                                value={medicalAllowance}
                                onChange={(e) => setMedicalAllowance(e.target.value)}
                                className="bg-slate-50 border-slate-200"
                            />
                            <Badge variant="outline" className="h-9 px-3 bg-blue-50 text-blue-700 border-blue-200 cursor-help" title="Medical allowance up to 10% of basic is often exempt">
                                <Info className="w-4 h-4 mr-1" />
                                Info
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Enter the portion of salary that is medical allowance (exempt).</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Other Monthly Tax Deductions (PKR)</Label>
                        <Input
                            type="number"
                            placeholder="Donations, Zakat, etc."
                            value={otherDeductions}
                            onChange={(e) => setOtherDeductions(e.target.value)}
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>

                    <Button
                        className="w-full mt-4 bg-primary hover:bg-primary/90"
                        onClick={calculate}
                        disabled={loading || !monthlySalary}
                    >
                        Calculate Tax
                    </Button>

                    {slabs.length === 0 && !loading && (
                        <p className="text-sm text-yellow-600 mt-2">No active tax slabs found. Please configure them in settings.</p>
                    )}
                </CardContent>
            </Card>

            {result && (
                <Card className="glass-card bg-slate-50/50">
                    <CardHeader>
                        <CardTitle>Calculation Result</CardTitle>
                        <CardDescription>Breakdown of your estimated salary</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Annual Gross</span>
                                <p className="text-xl font-semibold">{formatCurrency(result.annualGross)}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Taxable Income</span>
                                <p className="text-xl font-semibold text-blue-600">{formatCurrency(result.annualTaxable)}</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-white border border-slate-100">
                                <span className="text-sm font-medium">Monthly Tax</span>
                                <span className="text-lg font-bold text-red-600">{formatCurrency(result.monthlyTax)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-white border border-slate-100">
                                <span className="text-sm font-medium">Annual Tax</span>
                                <span className="font-semibold text-red-600">{formatCurrency(result.annualTax)}</span>
                            </div>
                            <div className="flex justify-between items-center px-3">
                                <span className="text-xs text-muted-foreground">Effective Tax Rate</span>
                                <span className="text-xs font-medium">{result.effectiveRate.toFixed(2)}%</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mt-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm opacity-90">Net Monthly Salary</p>
                                    <p className="text-xs opacity-70">After tax deduction</p>
                                </div>
                                <p className="text-3xl font-bold tracking-tight">{formatCurrency(result.monthlyNet)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
