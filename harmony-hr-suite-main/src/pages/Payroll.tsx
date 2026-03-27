import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PieChart,
  FileText,
  Play,
  Banknote,
  BarChart3,
  History,
  Settings,
  Wallet,
  Calculator,
  PlaneTakeoff
} from 'lucide-react';
import { AllowanceClaimForm } from '@/components/payroll/AllowanceClaimForm';
import { PayrollDashboard } from '@/components/payroll/PayrollDashboard';
import { SalaryStructureManager } from '@/components/payroll/SalaryStructureManager';
import { PayslipViewer } from '@/components/payroll/PayslipViewer';
import { PayrollProcessing } from '@/components/payroll/PayrollProcessing';
import { AdvanceRequestForm } from '@/components/payroll/AdvanceRequestForm';
import { PayrollReports } from '@/components/payroll/PayrollReports';
import { PayrollAuditLog } from '@/components/payroll/PayrollAuditLog';
import { SalaryTaxCalculator } from '@/components/payroll/SalaryTaxCalculator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function Payroll() {
  const { user, role } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const isAdmin = role === 'super_admin' || role === 'hr_admin';

  useEffect(() => {
    if (user) {
      fetchEmployeeId();
    }
  }, [user]);

  const fetchEmployeeId = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();
    if (data) setEmployeeId(data.id);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieChart, adminOnly: false },
    { id: 'payslips', label: 'Payslips', icon: FileText, adminOnly: false },
    { id: 'advances', label: 'Advances', icon: Banknote, adminOnly: false },
    { id: 'calculator', label: 'Tax Tool', icon: Calculator, adminOnly: false },
    { id: 'allowances', label: 'TA/DA', icon: PlaneTakeoff, adminOnly: false },
    { id: 'processing', label: 'Processing', icon: Play, adminOnly: true },
    { id: 'reports', label: 'Reports', icon: BarChart3, adminOnly: true },
    { id: 'audit', label: 'Audit', icon: History, adminOnly: true },
    { id: 'structures', label: 'Structures', icon: Settings, adminOnly: true },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  Payroll Management
                </h1>
                <p className="text-muted-foreground text-sm">
                  Manage salaries, payslips, and compensation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white rounded-xl border border-border/50 p-1.5 shadow-sm">
            <TabsList className="w-full flex flex-wrap justify-start gap-1 bg-transparent h-auto p-0">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-slate-50",
                    "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0">
            <PayrollDashboard />
          </TabsContent>

          <TabsContent value="payslips" className="mt-0">
            <PayslipViewer employeeId={employeeId || undefined} showAllEmployees={isAdmin} />
          </TabsContent>

          <TabsContent value="advances" className="mt-0">
            <AdvanceRequestForm employeeId={employeeId || undefined} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="calculator" className="mt-0">
            <SalaryTaxCalculator />
          </TabsContent>

          <TabsContent value="allowances" className="mt-0">
            <AllowanceClaimForm employeeId={employeeId || undefined} isAdmin={isAdmin} />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="processing" className="mt-0">
                <PayrollProcessing />
              </TabsContent>
              <TabsContent value="reports" className="mt-0">
                <PayrollReports />
              </TabsContent>
              <TabsContent value="audit" className="mt-0">
                <PayrollAuditLog />
              </TabsContent>
              <TabsContent value="structures" className="mt-0">
                <SalaryStructureManager />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
