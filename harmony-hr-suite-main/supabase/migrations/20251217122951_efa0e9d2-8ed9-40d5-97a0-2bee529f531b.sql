-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'general',
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Admins can create notifications for any user
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- System can create notifications (for edge functions)
CREATE POLICY "Service role can manage notifications"
ON public.notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Create workflow_rules table for automation rules
CREATE TABLE public.workflow_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  trigger_conditions jsonb DEFAULT '{}',
  action_type text NOT NULL,
  action_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

-- Admins can manage workflow rules
CREATE POLICY "Admins can manage workflow rules"
ON public.workflow_rules
FOR ALL
USING (is_admin(auth.uid()));

-- Authenticated users can view active rules
CREATE POLICY "Authenticated can view workflow rules"
ON public.workflow_rules
FOR SELECT
USING (is_active = true);

-- Create workflow_logs table for audit trail
CREATE TABLE public.workflow_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.workflow_rules(id),
  trigger_event text NOT NULL,
  trigger_data jsonb,
  action_taken text NOT NULL,
  action_result jsonb,
  status text DEFAULT 'completed',
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view workflow logs"
ON public.workflow_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Add updated_at trigger for workflow_rules
CREATE TRIGGER update_workflow_rules_updated_at
  BEFORE UPDATE ON public.workflow_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;