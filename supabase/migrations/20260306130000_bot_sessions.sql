-- ============================================================================
-- LUXURY WORLD - Telegram Bot Session Storage
-- Migration Date: March 6, 2026
-- Description: Add table to store bot conversation state for FSM wizard
-- ============================================================================

-- Bot sessions table for FSM state management
CREATE TABLE IF NOT EXISTS public.bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'IDLE',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

-- Public access for bot function (using service role)
CREATE POLICY "Service role full access bot_sessions" ON public.bot_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow the edge function to manage sessions
CREATE POLICY "Public manage bot_sessions" ON public.bot_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_bot_sessions_updated_at 
  BEFORE UPDATE ON public.bot_sessions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookup by chat_id
CREATE INDEX IF NOT EXISTS idx_bot_sessions_chat_id ON public.bot_sessions(chat_id);

-- Auto-cleanup old sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_bot_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.bot_sessions 
  WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
