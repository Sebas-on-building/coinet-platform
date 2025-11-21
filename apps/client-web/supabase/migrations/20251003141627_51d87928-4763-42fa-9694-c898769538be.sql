-- Create feedback tracking table
CREATE TABLE public.feedback_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_feedback_submitted_at TIMESTAMP WITH TIME ZONE,
  second_feedback_submitted_at TIMESTAMP WITH TIME ZONE,
  feedback_count INTEGER DEFAULT 0 NOT NULL,
  dismissed_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id),
  CONSTRAINT feedback_count_range CHECK (feedback_count >= 0 AND feedback_count <= 2)
);

-- Enable RLS
ALTER TABLE public.feedback_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own feedback tracking"
  ON public.feedback_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback tracking"
  ON public.feedback_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback tracking"
  ON public.feedback_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_feedback_tracking_updated_at
  BEFORE UPDATE ON public.feedback_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();