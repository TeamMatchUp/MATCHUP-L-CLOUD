
ALTER TABLE public.fighter_profiles 
  ADD COLUMN IF NOT EXISTS stance text,
  ADD COLUMN IF NOT EXISTS fighting_substyle text;
