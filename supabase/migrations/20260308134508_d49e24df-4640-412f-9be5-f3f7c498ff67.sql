
-- GAP 1: fighter_gym_links missing status and role
ALTER TABLE public.fighter_gym_links ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted';
ALTER TABLE public.fighter_gym_links ADD COLUMN IF NOT EXISTS role text;

-- GAP 2: Gyms table missing fields
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- GAP 3: Fighter profiles missing visibility, profile_image, verified
ALTER TABLE public.fighter_profiles ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE public.fighter_profiles ADD COLUMN IF NOT EXISTS profile_image text;
ALTER TABLE public.fighter_profiles ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- GAP 4: Events table missing fields
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue_name text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ticket_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS promotion_status text;

-- GAP 11: match_proposals missing message
ALTER TABLE public.match_proposals ADD COLUMN IF NOT EXISTS message text;

-- GAP 12: profiles missing country
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;

-- GAP 1: Add UPDATE policy for fighter_gym_links (for gym owners to approve/decline)
CREATE POLICY "Gym owners can update gym links"
ON public.fighter_gym_links
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'gym_owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'gym_owner'::app_role));

-- GAP 6: Organiser can delete events
CREATE POLICY "Organisers can delete their own events"
ON public.events
FOR DELETE
TO authenticated
USING (auth.uid() = organiser_id);

-- GAP 7: Gym Owner can delete gyms
CREATE POLICY "Gym owners can delete their own gyms"
ON public.gyms
FOR DELETE
TO authenticated
USING (auth.uid() = coach_id);
