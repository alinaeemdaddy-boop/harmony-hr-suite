-- Update tax slabs to match user-specified FBR rates
DELETE FROM public.tax_slabs WHERE fiscal_year = '2024-25';

INSERT INTO public.tax_slabs (fiscal_year, min_income, max_income, tax_rate, fixed_tax, description, is_active) VALUES
('2024-25', 0, 600000, 0, 0, 'No tax up to PKR 600,000', true),
('2024-25', 600001, 1200000, 5, 0, '5% on income exceeding PKR 600,000', true),
('2024-25', 1200001, 2400000, 10, 30000, '10% on income exceeding PKR 1,200,000 + PKR 30,000', true),
('2024-25', 2400001, 4800000, 15, 150000, '15% on income exceeding PKR 2,400,000 + PKR 150,000', true),
('2024-25', 4800001, NULL, 20, 510000, '20% on income exceeding PKR 4,800,000 + PKR 510,000', true);