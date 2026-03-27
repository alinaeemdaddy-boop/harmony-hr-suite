import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WorkflowAutomation } from '@/components/workflow/WorkflowAutomation';

export default function Workflow() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <WorkflowAutomation />
      </div>
    </DashboardLayout>
  );
}
