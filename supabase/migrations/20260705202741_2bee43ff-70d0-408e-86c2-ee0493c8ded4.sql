
CREATE TABLE public.event_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_expenses TO authenticated;
GRANT ALL ON public.event_expenses TO service_role;

ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organiser can view own event expenses"
  ON public.event_expenses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_expenses.event_id AND e.organiser_id = auth.uid()));

CREATE POLICY "Organiser can insert own event expenses"
  ON public.event_expenses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_expenses.event_id AND e.organiser_id = auth.uid()));

CREATE POLICY "Organiser can update own event expenses"
  ON public.event_expenses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_expenses.event_id AND e.organiser_id = auth.uid()));

CREATE POLICY "Organiser can delete own event expenses"
  ON public.event_expenses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_expenses.event_id AND e.organiser_id = auth.uid()));

CREATE INDEX idx_event_expenses_event_id ON public.event_expenses(event_id);

CREATE TRIGGER update_event_expenses_updated_at
  BEFORE UPDATE ON public.event_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
