
CREATE TABLE public.bout_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (slot_id, user_id)
);

ALTER TABLE public.bout_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bout acceptances viewable by authenticated" ON public.bout_acceptances
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own acceptances" ON public.bout_acceptances
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own acceptances" ON public.bout_acceptances
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
