
-- Add gym profile extension columns
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS training_schedule text;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS twitter_url text;

-- Create gym_leads table for contact CTA
CREATE TABLE IF NOT EXISTS public.gym_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  user_id uuid,
  type text NOT NULL DEFAULT 'interest',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert gym leads
CREATE POLICY "Anyone can submit gym leads" ON public.gym_leads
FOR INSERT TO public WITH CHECK (true);

-- Gym coaches can view their gym leads
CREATE POLICY "Coaches can view their gym leads" ON public.gym_leads
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gyms g
    WHERE g.id = gym_leads.gym_id AND g.coach_id = auth.uid()
  )
);

-- Admins can view all gym leads
CREATE POLICY "Admins can view all gym leads" ON public.gym_leads
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Change default status for fighter_gym_links to 'pending'
ALTER TABLE public.fighter_gym_links ALTER COLUMN status SET DEFAULT 'pending';
