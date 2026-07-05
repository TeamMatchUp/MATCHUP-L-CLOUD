
CREATE TABLE public.event_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  ticket_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

GRANT SELECT, INSERT ON public.event_waitlist TO authenticated;
GRANT INSERT ON public.event_waitlist TO anon;
GRANT ALL ON public.event_waitlist TO service_role;

ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the waitlist"
  ON public.event_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Organiser or joiner can view waitlist entries"
  ON public.event_waitlist
  FOR SELECT
  TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_waitlist.event_id
        AND e.organiser_id = auth.uid()
    )
  );

CREATE INDEX event_waitlist_event_id_idx ON public.event_waitlist(event_id);
