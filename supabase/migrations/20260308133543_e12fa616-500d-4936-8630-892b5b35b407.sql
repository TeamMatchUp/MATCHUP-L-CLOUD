
-- Migrate existing coach roles to gym_owner
UPDATE public.user_roles SET role = 'gym_owner' WHERE role = 'coach';

-- Update has_role function for tier inheritance
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR role = 'admin'
        OR (role = 'gym_owner' AND _role IN ('organiser', 'fighter', 'coach'))
      )
  )
$$;

-- Create fighter_records table
CREATE TABLE IF NOT EXISTS public.fighter_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_id uuid NOT NULL REFERENCES public.fighter_profiles(id) ON DELETE CASCADE,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  no_contests integer NOT NULL DEFAULT 0,
  updated_by_gym_id uuid REFERENCES public.gyms(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fighter_id)
);
ALTER TABLE public.fighter_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fighter records viewable by everyone" ON public.fighter_records FOR SELECT USING (true);
CREATE POLICY "Gym owners can insert fighter records" ON public.fighter_records FOR INSERT WITH CHECK (has_role(auth.uid(), 'gym_owner'));
CREATE POLICY "Gym owners can update fighter records" ON public.fighter_records FOR UPDATE USING (has_role(auth.uid(), 'gym_owner'));

-- Create fight_results table
CREATE TABLE IF NOT EXISTS public.fight_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  fighter_a_id uuid NOT NULL REFERENCES public.fighter_profiles(id),
  fighter_b_id uuid NOT NULL REFERENCES public.fighter_profiles(id),
  winner_id uuid REFERENCES public.fighter_profiles(id),
  method text,
  round integer,
  time text,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fight_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fight results viewable by everyone" ON public.fight_results FOR SELECT USING (true);
CREATE POLICY "Organisers and gym owners can insert fight results" ON public.fight_results FOR INSERT WITH CHECK (has_role(auth.uid(), 'organiser') OR has_role(auth.uid(), 'gym_owner'));
CREATE POLICY "Organisers and gym owners can update fight results" ON public.fight_results FOR UPDATE USING (has_role(auth.uid(), 'organiser') OR has_role(auth.uid(), 'gym_owner'));

-- Create result_verifications table
CREATE TABLE IF NOT EXISTS public.result_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES public.fight_results(id) ON DELETE CASCADE,
  verifier_type text NOT NULL,
  verifier_id uuid NOT NULL,
  verification_action text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.result_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Result verifications viewable by everyone" ON public.result_verifications FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert verifications" ON public.result_verifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type text NOT NULL,
  price numeric(10,2),
  quantity_available integer,
  sales_start timestamptz,
  sales_end timestamptz,
  external_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets viewable by everyone" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Organisers and gym owners can manage tickets" ON public.tickets FOR INSERT WITH CHECK (has_role(auth.uid(), 'organiser') OR has_role(auth.uid(), 'gym_owner'));
CREATE POLICY "Organisers and gym owners can update tickets" ON public.tickets FOR UPDATE USING (has_role(auth.uid(), 'organiser') OR has_role(auth.uid(), 'gym_owner'));

-- Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  promotion_type text NOT NULL,
  target_id uuid NOT NULL,
  start_date timestamptz,
  end_date timestamptz,
  boost_level integer DEFAULT 1,
  payment_status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promotions viewable by everyone" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Owners can manage their promotions" ON public.promotions FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their promotions" ON public.promotions FOR UPDATE USING (auth.uid() = owner_id);

-- Add triggers
CREATE TRIGGER update_fighter_records_updated_at BEFORE UPDATE ON public.fighter_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fight_results_updated_at BEFORE UPDATE ON public.fight_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
