ALTER TABLE public.fighter_profiles
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS rating_deviation numeric NOT NULL DEFAULT 350,
  ADD COLUMN IF NOT EXISTS volatility numeric NOT NULL DEFAULT 0.06,
  ADD COLUMN IF NOT EXISTS last_result_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_platform_confirmed_at timestamptz;