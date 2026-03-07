
-- Add email column to fighter_profiles for coach-fighter sync
ALTER TABLE public.fighter_profiles ADD COLUMN IF NOT EXISTS email text;

-- Create a function to sync fighter profile on signup
CREATE OR REPLACE FUNCTION public.sync_fighter_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If a fighter_profile exists with this email and no user_id, link it
  UPDATE public.fighter_profiles
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (on insert)
DROP TRIGGER IF EXISTS on_auth_user_created_sync_fighter ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_fighter
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_fighter_on_signup();

-- Update RLS: allow coaches and fighters to update fight_slots status (for decline re-open)
CREATE POLICY "Coaches can update fight slots for declined matches"
  ON public.fight_slots FOR UPDATE
  USING (has_role(auth.uid(), 'coach'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coach'::app_role));

-- Allow fighters to update fight_slots too (for decline flow)
CREATE POLICY "Fighters can update fight slots for declined matches"
  ON public.fight_slots FOR UPDATE
  USING (has_role(auth.uid(), 'fighter'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fighter'::app_role));
