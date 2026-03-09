
-- Coach nominations: coaches put forward fighters for events
CREATE TABLE public.coach_event_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  fighter_id uuid NOT NULL REFERENCES public.fighter_profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (fighter_id, event_id)
);

ALTER TABLE public.coach_event_nominations ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own nominations
CREATE POLICY "Coaches can view their nominations"
  ON public.coach_event_nominations FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Coaches can insert nominations
CREATE POLICY "Coaches can insert nominations"
  ON public.coach_event_nominations FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'coach'::app_role) AND auth.uid() = coach_id
  );

-- Coaches can delete their nominations
CREATE POLICY "Coaches can delete their nominations"
  ON public.coach_event_nominations FOR DELETE
  TO authenticated
  USING (auth.uid() = coach_id);
