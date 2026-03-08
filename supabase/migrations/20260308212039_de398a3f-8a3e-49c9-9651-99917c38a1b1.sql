
-- Create verification_status enum
CREATE TYPE public.fight_verification_status AS ENUM ('coach_verified', 'event_verified');

-- Create fights table for individual fight records
CREATE TABLE public.fights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  fighter_a_id uuid NOT NULL REFERENCES public.fighter_profiles(id) ON DELETE CASCADE,
  fighter_b_id uuid NOT NULL REFERENCES public.fighter_profiles(id) ON DELETE CASCADE,
  winner_id uuid REFERENCES public.fighter_profiles(id) ON DELETE SET NULL,
  method text,
  round integer,
  event_name text,
  event_date date,
  opponent_name text,
  opponent_gym text,
  result text NOT NULL DEFAULT 'win',
  created_by_coach_id uuid,
  verification_status public.fight_verification_status NOT NULL DEFAULT 'coach_verified',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fights ENABLE ROW LEVEL SECURITY;

-- Everyone can read fights
CREATE POLICY "Fights viewable by everyone"
  ON public.fights FOR SELECT
  USING (true);

-- Coaches can insert fights for fighters in their gym
CREATE POLICY "Coaches can insert coach_verified fights"
  ON public.fights FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'coach'::app_role)
    AND created_by_coach_id = auth.uid()
    AND verification_status = 'coach_verified'
  );

-- Coaches can update fights they created (only coach_verified)
CREATE POLICY "Coaches can update their coach_verified fights"
  ON public.fights FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'coach'::app_role)
    AND created_by_coach_id = auth.uid()
    AND verification_status = 'coach_verified'
  );

-- Coaches can delete fights they created (only coach_verified)
CREATE POLICY "Coaches can delete their coach_verified fights"
  ON public.fights FOR DELETE
  USING (
    public.has_role(auth.uid(), 'coach'::app_role)
    AND created_by_coach_id = auth.uid()
    AND verification_status = 'coach_verified'
  );

-- Organisers can insert event_verified fights
CREATE POLICY "Organisers can insert event_verified fights"
  ON public.fights FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'organiser'::app_role)
    AND verification_status = 'event_verified'
  );

-- Admins can do anything
CREATE POLICY "Admins can manage all fights"
  ON public.fights FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_fights_updated_at
  BEFORE UPDATE ON public.fights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
