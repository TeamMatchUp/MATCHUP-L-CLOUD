
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('organiser', 'coach', 'fighter');

CREATE TYPE public.match_status AS ENUM (
  'pending_coach_a', 'pending_coach_b',
  'pending_fighter_a', 'pending_fighter_b',
  'confirmed', 'declined', 'withdrawn'
);

CREATE TYPE public.fight_slot_status AS ENUM ('open', 'proposed', 'confirmed', 'cancelled');

CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'completed', 'cancelled');

CREATE TYPE public.weight_class AS ENUM (
  'strawweight', 'flyweight', 'bantamweight', 'featherweight',
  'lightweight', 'super_lightweight', 'welterweight', 'super_welterweight',
  'middleweight', 'super_middleweight', 'light_heavyweight',
  'cruiserweight', 'heavyweight', 'super_heavyweight'
);

CREATE TYPE public.fighting_style AS ENUM ('boxing', 'muay_thai', 'mma', 'kickboxing', 'bjj');

CREATE TYPE public.country_code AS ENUM ('UK', 'USA', 'AUS');

CREATE TYPE public.notification_type AS ENUM (
  'match_proposed', 'match_accepted', 'match_declined',
  'match_confirmed', 'match_withdrawn', 'event_update', 'system'
);

CREATE TYPE public.confirmation_decision AS ENUM ('accepted', 'declined');

-- =============================================
-- HELPER FUNCTION: updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- TABLE: profiles
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TABLE: user_roles
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TABLE: gyms
-- =============================================
CREATE TABLE public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  country public.country_code NOT NULL DEFAULT 'UK',
  description TEXT,
  logo_url TEXT,
  coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gyms are viewable by everyone"
  ON public.gyms FOR SELECT USING (true);

CREATE POLICY "Coaches can create gyms"
  ON public.gyms FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Coaches can update their own gyms"
  ON public.gyms FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE TRIGGER update_gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: fighter_profiles
-- =============================================
CREATE TABLE public.fighter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  weight_class public.weight_class NOT NULL,
  record_wins INT NOT NULL DEFAULT 0,
  record_losses INT NOT NULL DEFAULT 0,
  record_draws INT NOT NULL DEFAULT 0,
  height TEXT,
  reach TEXT,
  style public.fighting_style,
  country public.country_code NOT NULL DEFAULT 'UK',
  available BOOLEAN NOT NULL DEFAULT true,
  bio TEXT,
  created_by_coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fighter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fighter profiles are viewable by everyone"
  ON public.fighter_profiles FOR SELECT USING (true);

CREATE POLICY "Fighters can update their own profile"
  ON public.fighter_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can create fighter profiles"
  ON public.fighter_profiles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'coach')
    OR public.has_role(auth.uid(), 'fighter')
  );

CREATE POLICY "Coaches can update fighters they created"
  ON public.fighter_profiles FOR UPDATE
  USING (auth.uid() = created_by_coach_id);

CREATE TRIGGER update_fighter_profiles_updated_at
  BEFORE UPDATE ON public.fighter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: fighter_gym_links (many-to-many)
-- =============================================
CREATE TABLE public.fighter_gym_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_id UUID NOT NULL REFERENCES public.fighter_profiles(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fighter_id, gym_id)
);

ALTER TABLE public.fighter_gym_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fighter gym links are viewable by everyone"
  ON public.fighter_gym_links FOR SELECT USING (true);

CREATE POLICY "Coaches and fighters can manage gym links"
  ON public.fighter_gym_links FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'coach')
    OR public.has_role(auth.uid(), 'fighter')
  );

CREATE POLICY "Coaches and fighters can delete gym links"
  ON public.fighter_gym_links FOR DELETE
  USING (
    public.has_role(auth.uid(), 'coach')
    OR public.has_role(auth.uid(), 'fighter')
  );

-- =============================================
-- TABLE: events
-- =============================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  country public.country_code NOT NULL DEFAULT 'UK',
  promotion_name TEXT,
  description TEXT,
  status public.event_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published events are viewable by everyone"
  ON public.events FOR SELECT
  USING (status = 'published' OR auth.uid() = organiser_id);

CREATE POLICY "Organisers can create events"
  ON public.events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'organiser') AND auth.uid() = organiser_id);

CREATE POLICY "Organisers can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = organiser_id);

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: fight_slots
-- =============================================
CREATE TABLE public.fight_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  weight_class public.weight_class NOT NULL,
  slot_number INT NOT NULL DEFAULT 1,
  status public.fight_slot_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fight_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fight slots are viewable by everyone"
  ON public.fight_slots FOR SELECT USING (true);

CREATE POLICY "Organisers can manage fight slots"
  ON public.fight_slots FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'organiser'));

CREATE POLICY "Organisers can update fight slots"
  ON public.fight_slots FOR UPDATE
  USING (public.has_role(auth.uid(), 'organiser'));

CREATE TRIGGER update_fight_slots_updated_at
  BEFORE UPDATE ON public.fight_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: match_proposals
-- =============================================
CREATE TABLE public.match_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fight_slot_id UUID NOT NULL REFERENCES public.fight_slots(id) ON DELETE CASCADE,
  fighter_a_id UUID NOT NULL REFERENCES public.fighter_profiles(id),
  fighter_b_id UUID NOT NULL REFERENCES public.fighter_profiles(id),
  proposed_by UUID NOT NULL REFERENCES auth.users(id),
  status public.match_status NOT NULL DEFAULT 'pending_coach_a',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT different_fighters CHECK (fighter_a_id != fighter_b_id)
);

ALTER TABLE public.match_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match proposals viewable by involved parties"
  ON public.match_proposals FOR SELECT
  USING (
    public.has_role(auth.uid(), 'organiser')
    OR public.has_role(auth.uid(), 'coach')
    OR public.has_role(auth.uid(), 'fighter')
  );

CREATE POLICY "Organisers can create match proposals"
  ON public.match_proposals FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'organiser') AND auth.uid() = proposed_by);

CREATE POLICY "Organisers can update match proposals"
  ON public.match_proposals FOR UPDATE
  USING (public.has_role(auth.uid(), 'organiser') OR public.has_role(auth.uid(), 'coach'));

CREATE TRIGGER update_match_proposals_updated_at
  BEFORE UPDATE ON public.match_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: confirmations
-- =============================================
CREATE TABLE public.confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_proposal_id UUID NOT NULL REFERENCES public.match_proposals(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  decision public.confirmation_decision NOT NULL,
  comment TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Confirmations viewable by authenticated users"
  ON public.confirmations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own confirmations"
  ON public.confirmations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TABLE: notifications
-- =============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
