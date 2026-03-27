import { supabase } from '@/integrations/supabase/client';

interface TriggerPayload {
  trigger_event: string;
  trigger_data: Record<string, unknown>;
  user_id?: string;
  employee_id?: string;
}

export async function triggerWorkflow(payload: TriggerPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('workflow-automation', {
      body: payload,
    });

    if (error) {
      console.error('Error triggering workflow:', error);
    }
  } catch (error) {
    console.error('Failed to trigger workflow:', error);
  }
}

// Convenience functions for common triggers
export const workflowTriggers = {
  leaveRequestCreated: (userId: string, employeeId: string, data: Record<string, unknown>) =>
    triggerWorkflow({
      trigger_event: 'leave_request_created',
      user_id: userId,
      employee_id: employeeId,
      trigger_data: { ...data, entity_type: 'leave_request' },
    }),

  leaveRequestApproved: (userId: string, data: Record<string, unknown>) =>
    triggerWorkflow({
      trigger_event: 'leave_request_approved',
      user_id: userId,
      trigger_data: { ...data, entity_type: 'leave_request' },
    }),

  leaveRequestRejected: (userId: string, data: Record<string, unknown>) =>
    triggerWorkflow({
      trigger_event: 'leave_request_rejected',
      user_id: userId,
      trigger_data: { ...data, entity_type: 'leave_request' },
    }),

  leaveRequestCancelled: (userId: string, data: Record<string, unknown>) =>
    triggerWorkflow({
      trigger_event: 'leave_request_cancelled',
      user_id: userId,
      trigger_data: { ...data, entity_type: 'leave_request' },
    }),

  attendanceLate: (userId: string, employeeId: string, data: Record<string, unknown>) =>
    triggerWorkflow({
      trigger_event: 'attendance_late',
      user_id: userId,
      employee_id: employeeId,
      trigger_data: { ...data, entity_type: 'attendance' },
    }),

  attendanceAbsent: (userId: string, employeeId: string, data: Record<string, unknown>) =>
    triggerWorkflow({
      trigger_event: 'attendance_absent',
      user_id: userId,
      employee_id: employeeId,
      trigger_data: { ...data, entity_type: 'attendance' },
    }),

  payrollProcessed: (userId: string, data: Record<string, unknown>) =>
    triggerWorkflow({
      trigger_event: 'payroll_processed',
      user_id: userId,
      trigger_data: { ...data, entity_type: 'payroll' },
    }),

  documentUploaded: (userId: string, employeeId: string, data: Record<string, unknown>) =>
    triggerWorkflow({
      trigger_event: 'document_uploaded',
      user_id: userId,
      employee_id: employeeId,
      trigger_data: { ...data, entity_type: 'document' },
    }),

  employeeOnboarded: (userId: string, employeeId: string, data: Record<string, unknown>) =>
    triggerWorkflow({
      trigger_event: 'employee_onboarded',
      user_id: userId,
      employee_id: employeeId,
      trigger_data: { ...data, entity_type: 'employee' },
    }),
};
