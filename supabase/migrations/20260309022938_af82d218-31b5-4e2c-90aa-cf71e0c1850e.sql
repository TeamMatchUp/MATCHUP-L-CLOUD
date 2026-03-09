
-- Create fighter_event_interests table
CREATE TABLE public.fighter_event_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_id uuid NOT NULL REFERENCES public.fighter_profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (fighter_id, event_id)
);

-- Enable RLS
ALTER TABLE public.fighter_event_interests ENABLE ROW LEVEL SECURITY;

-- Everyone can view interests (needed for coaches to see their fighters' interests)
CREATE POLICY "Interests viewable by authenticated users"
  ON public.fighter_event_interests FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fighters can insert their own interests (via their fighter_profile)
CREATE POLICY "Fighters can insert their own interests"
  ON public.fighter_event_interests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fighter_profiles fp
      WHERE fp.id = fighter_id AND fp.user_id = auth.uid()
    )
  );

-- Fighters can delete their own interests
CREATE POLICY "Fighters can delete their own interests"
  ON public.fighter_event_interests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fighter_profiles fp
      WHERE fp.id = fighter_id AND fp.user_id = auth.uid()
    )
  );
