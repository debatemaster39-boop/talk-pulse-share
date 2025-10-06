-- Create queue table for matchmaking
CREATE TABLE IF NOT EXISTS public.queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  topic_id uuid,
  joined_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'waiting'
);

-- Enable RLS
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can join queue"
  ON public.queue FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view queue"
  ON public.queue FOR SELECT USING (true);

CREATE POLICY "Anyone can update queue"
  ON public.queue FOR UPDATE USING (true);

CREATE POLICY "Anyone can leave queue"
  ON public.queue FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_sessions;