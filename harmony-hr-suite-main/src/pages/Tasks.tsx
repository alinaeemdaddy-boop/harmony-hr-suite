import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TaskManager } from '@/components/tasks/TaskManager';

export default function Tasks() {
    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <TaskManager />
            </div>
        </DashboardLayout>
    );
}
