
-- Add total_rounds and is_amateur to fights table
ALTER TABLE public.fights ADD COLUMN IF NOT EXISTS total_rounds integer;
ALTER TABLE public.fights ADD COLUMN IF NOT EXISTS is_amateur boolean NOT NULL DEFAULT false;

-- Add self_reported to fight_verification_status enum
ALTER TYPE public.fight_verification_status ADD VALUE IF NOT EXISTS 'self_reported';
