-- ========================================
-- CRITICAL SECURITY FIXES
-- ========================================

-- First, drop the overly permissive RLS policies
DROP POLICY IF EXISTS "Allow all operations on agent_parsing_logs" ON public.agent_parsing_logs;
DROP POLICY IF EXISTS "Allow all operations on agent_refinement_logs" ON public.agent_refinement_logs;

-- Make user_id columns NOT NULL for security (existing data will use a default user)
-- We'll set a constraint that user_id must be provided for new records
ALTER TABLE public.agent_parsing_logs 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.agent_refinement_logs 
ALTER COLUMN user_id SET NOT NULL;

-- ========================================
-- SECURE RLS POLICIES FOR AGENT_PARSING_LOGS
-- ========================================

-- Users can only view their own parsing logs
CREATE POLICY "Users can view own parsing logs" 
ON public.agent_parsing_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert parsing logs for themselves
CREATE POLICY "Users can insert own parsing logs" 
ON public.agent_parsing_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own parsing logs
CREATE POLICY "Users can update own parsing logs" 
ON public.agent_parsing_logs 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own parsing logs
CREATE POLICY "Users can delete own parsing logs" 
ON public.agent_parsing_logs 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- ========================================
-- SECURE RLS POLICIES FOR AGENT_REFINEMENT_LOGS
-- ========================================

-- Users can only view their own refinement logs
CREATE POLICY "Users can view own refinement logs" 
ON public.agent_refinement_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert refinement logs for themselves
CREATE POLICY "Users can insert own refinement logs" 
ON public.agent_refinement_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own refinement logs
CREATE POLICY "Users can update own refinement logs" 
ON public.agent_refinement_logs 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own refinement logs
CREATE POLICY "Users can delete own refinement logs" 
ON public.agent_refinement_logs 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- ========================================
-- ADD SECURITY AUDIT FUNCTION
-- ========================================

-- Create function to log security events (for future monitoring)
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  details JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
  -- This function can be extended to log to a security audit table
  -- For now, it's a placeholder for future security monitoring
  RAISE LOG 'Security Event: % - Details: %', event_type, details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ADD INDEXES FOR PERFORMANCE ON SECURITY QUERIES
-- ========================================

-- Index on user_id for efficient RLS policy checks
CREATE INDEX IF NOT EXISTS idx_agent_parsing_logs_user_id ON public.agent_parsing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_refinement_logs_user_id ON public.agent_refinement_logs(user_id);

-- Composite index for user + created_at for efficient user data queries
CREATE INDEX IF NOT EXISTS idx_agent_parsing_logs_user_created ON public.agent_parsing_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_refinement_logs_user_created ON public.agent_refinement_logs(user_id, created_at DESC);