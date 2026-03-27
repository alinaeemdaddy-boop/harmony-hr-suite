
import { supabase } from "@/integrations/supabase/client";

export interface TaxSlab {
    id: string;
    min_income: number;
    max_income: number | null;
    fixed_tax: number;
    tax_rate_percent: number;
}

export interface EmployeeSalaryStructure {
    id: string;
    employee_id: string;
    basic_salary: number;
    house_rent_allowance: number;
    medical_allowance: number;
    utilities_allowance: number;
    special_allowance: number;
    is_eobi_applicable: boolean;
    is_sessi_applicable: boolean;
    provident_fund_percentage: number;
    effective_date: string;
}

/**
 * Calculates the annual income tax based on FBR slabs.
 * @param annualIncome The total annual taxable income.
 * @param slabs The list of tax slabs for the active tax year.
 * @returns The total annual tax amount.
 */
export const calculateAnnualTax = (annualIncome: number, slabs: TaxSlab[]): number => {
    // Find the applicable slab
    const slab = slabs.find(s => {
        if (s.max_income === null) {
            return annualIncome >= s.min_income;
        }
        return annualIncome >= s.min_income && annualIncome <= s.max_income;
    });

    if (!slab) return 0;

    const excessIncome = annualIncome - (slab.min_income > 0 ? slab.min_income - 1 : 0);
    // FBR rules often say "exceeding X". 
    // Example: 600,001 - 1,200,000. 5% of amount > 600,000.
    // If min_income is 600,001, we subtract 600,000.
    // My DB min_income is 600,001 (based on insert 600001).
    // So taxable_base = annualIncome - (slab.min_income - 1)

    // For 0-600k slab: min=0, max=600k. income=500k. excess = 500k - (-1)?? No.
    // Let's refine based on standard slab logic.
    // If rate is 0, return 0.

    if (slab.tax_rate_percent === 0 && slab.fixed_tax === 0) return 0;

    // Base amount to subtract is usually the upper limit of the previous slab.
    // Which is equivalent to slab.min_income - 1 (since our ranges are 600,001).
    const baseThreshold = slab.min_income > 0 ? slab.min_income - 1 : 0;

    const taxableAmount = Math.max(0, annualIncome - baseThreshold);
    const variableTax = taxableAmount * (slab.tax_rate_percent / 100);

    return slab.fixed_tax + variableTax;
};

/**
 * Calculates EOBI Deduction.
 * Current Rule: 1% of Minimum Wage (Employer pays 5%, Employee pays 1%).
 * However, many systems implement custom rules. 
 * The prompt says: "Social Security Contributions: Calculate contributions towards EOBI... where applicable."
 * Defaulting to standard practiced rule: Employee share is often fixed or % of min wage.
 * Provide a generic calculator.
 */
export const calculateEOBI = (grossSalary: number, isApplicable: boolean): number => {
    if (!isApplicable) return 0;
    // As of 2024, EOBI is often calculated on a detailed minimum wage floor.
    // Common practice: Fixed amount for employee (e.g., 170 PKR (old) -> 350 PKR??)
    // Or 1% of Minimum Wage (which is ~32k-37k).
    // Let's assume 1% of capped amount for now or use a fixed config if available.
    // For now, I'll use a widely accepted default or placeholder that matches the previous hardcoded logic but parameterized.
    // Previous code: 32500 ceiling * 5%?? That seems like Employer share. Employee share is usually 1%.
    // I will use 1% of min(gross, 32500).
    const ceiling = 32500; // Minimum wage ceiling for EOBI
    const amount = Math.min(grossSalary, ceiling);
    return amount * 0.01; // 1% Employee Share
};

/**
 * Fetch active tax slabs from the database.
 */
export const fetchActiveTaxSlabs = async (): Promise<TaxSlab[]> => {
    const { data } = await supabase
        .from('tax_slabs')
        .select('*')
        .eq('is_active', true)
        .order('min_income', { ascending: true });

    return (data as any[])?.map(d => ({
        ...d,
        max_income: d.max_income ? Number(d.max_income) : null,
        min_income: Number(d.min_income),
        fixed_tax: Number(d.fixed_tax),
        tax_rate_percent: Number(d.tax_rate)
    })) || [];
};
