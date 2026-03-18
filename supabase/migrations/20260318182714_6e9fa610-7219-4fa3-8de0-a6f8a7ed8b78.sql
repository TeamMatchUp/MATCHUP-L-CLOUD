
ALTER TABLE public.fighter_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS walk_around_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS amateur_wins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amateur_losses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amateur_draws integer NOT NULL DEFAULT 0;

ALTER TABLE public.fighter_profiles
  ALTER COLUMN height TYPE integer USING (CASE WHEN height ~ '^\d+$' THEN height::integer ELSE NULL END),
  ALTER COLUMN reach TYPE integer USING (CASE WHEN reach ~ '^\d+$' THEN reach::integer ELSE NULL END);
