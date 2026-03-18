
-- Add fighter Layer B fields
ALTER TABLE public.fighter_profiles ADD COLUMN IF NOT EXISTS training_background text;
ALTER TABLE public.fighter_profiles ADD COLUMN IF NOT EXISTS years_training integer;
ALTER TABLE public.fighter_profiles ADD COLUMN IF NOT EXISTS region text;

-- Event claims table
CREATE TABLE IF NOT EXISTS public.event_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimant_name text NOT NULL,
  claimant_email text NOT NULL,
  claimant_role text NOT NULL,
  promotion_name text,
  verification_doc_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can submit event claims" ON public.event_claims
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own event claims" ON public.event_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all event claims" ON public.event_claims
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update event claims" ON public.event_claims
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Upgrade waitlist table
CREATE TABLE IF NOT EXISTS public.upgrade_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  desired_tier text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.upgrade_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit to upgrade waitlist" ON public.upgrade_waitlist
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Users can view own waitlist entries" ON public.upgrade_waitlist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all waitlist entries" ON public.upgrade_waitlist
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Gym profile views tracking table
CREATE TABLE IF NOT EXISTS public.gym_profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  viewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert gym profile views" ON public.gym_profile_views
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Gym coaches can view their gym views" ON public.gym_profile_views
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM gyms g WHERE g.id = gym_profile_views.gym_id AND g.coach_id = auth.uid())
  );

CREATE POLICY "Admins can view all gym profile views" ON public.gym_profile_views
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
