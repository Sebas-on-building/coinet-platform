-- Create tables for natural language agent processing

-- Table for logging agent parsing requests and results
CREATE TABLE public.agent_parsing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  description TEXT NOT NULL,
  context JSONB,
  type TEXT,
  result JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for logging agent refinement requests and results
CREATE TABLE public.agent_refinement_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  original_structure JSONB NOT NULL,
  feedback TEXT,
  adjustments JSONB,
  result JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.agent_parsing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_refinement_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since these are processing logs)
CREATE POLICY "Allow all operations on agent_parsing_logs" 
ON public.agent_parsing_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on agent_refinement_logs" 
ON public.agent_refinement_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_agent_parsing_logs_created_at ON public.agent_parsing_logs(created_at);
CREATE INDEX idx_agent_parsing_logs_success ON public.agent_parsing_logs(success);
CREATE INDEX idx_agent_refinement_logs_created_at ON public.agent_refinement_logs(created_at);
CREATE INDEX idx_agent_refinement_logs_success ON public.agent_refinement_logs(success);