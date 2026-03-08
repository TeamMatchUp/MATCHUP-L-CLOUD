
-- Add 'pending' to match_status enum
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'pending';

-- Add new columns to fight_slots for richer match criteria
ALTER TABLE public.fight_slots
  ADD COLUMN IF NOT EXISTS card_position text NOT NULL DEFAULT 'undercard',
  ADD COLUMN IF NOT EXISTS experience_level text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_weight_kg numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_weight_kg numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_wins integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_wins integer DEFAULT NULL;
