-- Drop all policies
DROP POLICY IF EXISTS "Users can send messages in their sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can create sessions" ON public.debate_sessions;
DROP POLICY IF EXISTS "Users can update their sessions" ON public.debate_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.debate_sessions;

-- Drop all foreign key constraints
ALTER TABLE public.debate_sessions DROP CONSTRAINT IF EXISTS debate_sessions_user_a_fkey;
ALTER TABLE public.debate_sessions DROP CONSTRAINT IF EXISTS debate_sessions_user_b_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Alter columns to text
ALTER TABLE public.debate_sessions 
  ALTER COLUMN user_a TYPE text,
  ALTER COLUMN user_b TYPE text;

ALTER TABLE public.messages
  ALTER COLUMN sender_id TYPE text;

-- Create permissive policies
CREATE POLICY "Anyone can create sessions"
  ON public.debate_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view sessions"
  ON public.debate_sessions FOR SELECT USING (true);

CREATE POLICY "Anyone can update sessions"
  ON public.debate_sessions FOR UPDATE USING (true);

CREATE POLICY "Anyone can send messages"
  ON public.messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view messages"
  ON public.messages FOR SELECT USING (true);