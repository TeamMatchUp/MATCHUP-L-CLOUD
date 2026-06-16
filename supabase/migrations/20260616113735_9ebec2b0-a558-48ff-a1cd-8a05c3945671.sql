ALTER TABLE public.fighter_profiles
  ADD COLUMN IF NOT EXISTS available_days text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS available_times text[] DEFAULT '{}'::text[];