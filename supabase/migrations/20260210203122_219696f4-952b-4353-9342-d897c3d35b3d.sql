
ALTER TABLE public.query_history ADD COLUMN session_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX idx_query_history_session_id ON public.query_history (session_id);
