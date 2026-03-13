
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow public read/write since there's no auth
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on memories"
  ON public.memories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert on memories"
  ON public.memories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete on memories"
  ON public.memories FOR DELETE
  TO anon, authenticated
  USING (true);
