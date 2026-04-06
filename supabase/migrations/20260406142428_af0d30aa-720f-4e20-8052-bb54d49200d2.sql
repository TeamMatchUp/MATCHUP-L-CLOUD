
CREATE TABLE IF NOT EXISTS public.fighter_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_id uuid REFERENCES public.fighter_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  organisation text,
  weight_class text,
  awarded_by_coach_id uuid REFERENCES public.profiles(id),
  awarded_at date,
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fighter_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Titles are publicly viewable"
  ON public.fighter_titles FOR SELECT
  USING (true);

CREATE POLICY "Coaches can manage titles"
  ON public.fighter_titles FOR ALL
  TO authenticated
  USING (awarded_by_coach_id = auth.uid())
  WITH CHECK (awarded_by_coach_id = auth.uid());
