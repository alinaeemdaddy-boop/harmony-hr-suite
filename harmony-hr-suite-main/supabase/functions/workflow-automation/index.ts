import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriggerPayload {
  trigger_event: string;
  trigger_data: Record<string, unknown>;
  user_id?: string;
  employee_id?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload: TriggerPayload = await req.json();
    console.log("Workflow trigger received:", payload);

    // Fetch active workflow rules that match the trigger event
    const { data: rules, error: rulesError } = await supabase
      .from("workflow_rules")
      .select("*")
      .eq("trigger_event", payload.trigger_event)
      .eq("is_active", true);

    if (rulesError) {
      console.error("Error fetching workflow rules:", rulesError);
      throw rulesError;
    }

    if (!rules || rules.length === 0) {
      console.log("No active rules found for trigger:", payload.trigger_event);
      return new Response(
        JSON.stringify({ message: "No active rules for this trigger", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${rules.length} active rules for trigger: ${payload.trigger_event}`);

    const results = [];

    for (const rule of rules) {
      try {
        let actionResult: Record<string, unknown> = {};

        switch (rule.action_type) {
          case "send_notification": {
            const targetUserId = payload.user_id;
            if (targetUserId) {
              const message = formatMessage(
                rule.action_config?.message || "You have a new notification",
                payload.trigger_data
              );

              const { error: notifError } = await supabase
                .from("notifications")
                .insert({
                  user_id: targetUserId,
                  title: rule.name,
                  message: message,
                  type: getNotificationType(payload.trigger_event),
                  category: getCategoryFromEvent(payload.trigger_event),
                  related_entity_type: payload.trigger_data?.entity_type as string || null,
                  related_entity_id: payload.trigger_data?.entity_id as string || null,
                });

              if (notifError) {
                console.error("Error creating notification:", notifError);
                actionResult = { success: false, error: notifError.message };
              } else {
                console.log("Notification created for user:", targetUserId);
                actionResult = { success: true, notification_sent: true };
              }
            } else {
              actionResult = { success: false, error: "No target user ID provided" };
            }
            break;
          }

          case "escalate_manager": {
            // Find the employee's manager and send notification
            if (payload.employee_id) {
              const { data: employee } = await supabase
                .from("employees")
                .select("reporting_manager_id, full_name")
                .eq("id", payload.employee_id)
                .single();

              if (employee?.reporting_manager_id) {
                // Get manager's user_id
                const { data: manager } = await supabase
                  .from("employees")
                  .select("user_id, full_name")
                  .eq("id", employee.reporting_manager_id)
                  .single();

                if (manager?.user_id) {
                  const message = `Action required: ${employee.full_name} - ${formatMessage(
                    rule.action_config?.message || "Requires your attention",
                    payload.trigger_data
                  )}`;

                  await supabase.from("notifications").insert({
                    user_id: manager.user_id,
                    title: `Escalation: ${rule.name}`,
                    message: message,
                    type: "warning",
                    category: "approval",
                    related_entity_type: payload.trigger_data?.entity_type as string || null,
                    related_entity_id: payload.trigger_data?.entity_id as string || null,
                  });

                  actionResult = { success: true, escalated_to: manager.full_name };
                }
              }
            }
            break;
          }

          case "schedule_reminder": {
            // For now, create an immediate reminder notification
            // In a production system, this would integrate with a scheduling service
            if (payload.user_id) {
              await supabase.from("notifications").insert({
                user_id: payload.user_id,
                title: `Reminder: ${rule.name}`,
                message: formatMessage(
                  rule.action_config?.message || "This is a scheduled reminder",
                  payload.trigger_data
                ),
                type: "pending",
                category: getCategoryFromEvent(payload.trigger_event),
              });
              actionResult = { success: true, reminder_scheduled: true };
            }
            break;
          }

          default:
            actionResult = { success: true, action_type: rule.action_type };
        }

        // Log the workflow execution
        await supabase.from("workflow_logs").insert({
          rule_id: rule.id,
          trigger_event: payload.trigger_event,
          trigger_data: payload.trigger_data,
          action_taken: rule.action_type,
          action_result: actionResult,
          status: actionResult.success ? "completed" : "failed",
          error_message: actionResult.error as string || null,
        });

        results.push({
          rule_id: rule.id,
          rule_name: rule.name,
          ...actionResult,
        });

      } catch (ruleError) {
        console.error(`Error processing rule ${rule.id}:`, ruleError);
        
        await supabase.from("workflow_logs").insert({
          rule_id: rule.id,
          trigger_event: payload.trigger_event,
          trigger_data: payload.trigger_data,
          action_taken: rule.action_type,
          status: "failed",
          error_message: String(ruleError),
        });

        results.push({
          rule_id: rule.id,
          rule_name: rule.name,
          success: false,
          error: String(ruleError),
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Workflow automation executed",
        processed: results.length,
        results 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in workflow-automation function:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function formatMessage(template: string, data: Record<string, unknown>): string {
  let message = template;
  for (const [key, value] of Object.entries(data)) {
    message = message.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  }
  return message;
}

function getNotificationType(event: string): string {
  if (event.includes("approved")) return "success";
  if (event.includes("rejected")) return "error";
  if (event.includes("late") || event.includes("absent")) return "warning";
  return "info";
}

function getCategoryFromEvent(event: string): string {
  if (event.includes("leave")) return "leave";
  if (event.includes("payroll")) return "payroll";
  if (event.includes("attendance")) return "attendance";
  if (event.includes("document")) return "document";
  return "general";
}
