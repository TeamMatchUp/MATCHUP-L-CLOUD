
-- Match suggestions table
CREATE TABLE public.match_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  fighter_a_id uuid REFERENCES public.fighter_profiles(id) NOT NULL,
  fighter_b_id uuid REFERENCES public.fighter_profiles(id) NOT NULL,
  composite_score numeric,
  competitiveness numeric,
  entertainment numeric,
  style_contrast numeric,
  narrative numeric,
  confidence_a integer,
  confidence_b integer,
  flags text[],
  preset_used text,
  status text NOT NULL DEFAULT 'suggested',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match suggestions viewable by authenticated" ON public.match_suggestions
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Organisers can insert match suggestions" ON public.match_suggestions
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'organiser'::app_role));

CREATE POLICY "Organisers can update match suggestions" ON public.match_suggestions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'organiser'::app_role));

CREATE POLICY "Organisers can delete match suggestions" ON public.match_suggestions
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'organiser'::app_role));

-- Event fight slots table
CREATE TABLE public.event_fight_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  weight_class text,
  discipline text,
  bout_type text,
  slot_number integer,
  fighter_a_id uuid REFERENCES public.fighter_profiles(id),
  fighter_b_id uuid REFERENCES public.fighter_profiles(id),
  status text NOT NULL DEFAULT 'empty',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_fight_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event fight slots viewable by authenticated" ON public.event_fight_slots
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Organisers can insert event fight slots" ON public.event_fight_slots
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'organiser'::app_role));

CREATE POLICY "Organisers can update event fight slots" ON public.event_fight_slots
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'organiser'::app_role));

CREATE POLICY "Organisers can delete event fight slots" ON public.event_fight_slots
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'organiser'::app_role));

-- Organiser preferences table
CREATE TABLE public.organiser_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  preset text,
  w_comp numeric,
  w_ent numeric,
  w_style numeric,
  w_narr numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organiser_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.organiser_preferences
  FOR SELECT TO authenticated USING (auth.uid() = organiser_id);

CREATE POLICY "Users can insert own preferences" ON public.organiser_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = organiser_id);

CREATE POLICY "Users can update own preferences" ON public.organiser_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = organiser_id);
