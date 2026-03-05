
-- Make organiser_id nullable so seed events can exist without a real user
ALTER TABLE public.events ALTER COLUMN organiser_id DROP NOT NULL;
