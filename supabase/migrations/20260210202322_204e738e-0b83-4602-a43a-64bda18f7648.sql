
CREATE TABLE public.query_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.query_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queries"
ON public.query_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own queries"
ON public.query_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queries"
ON public.query_history FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_query_history_user_id ON public.query_history (user_id);
CREATE INDEX idx_query_history_created_at ON public.query_history (created_at DESC);
