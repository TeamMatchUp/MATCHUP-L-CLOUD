-- Fix the FK constraint to allow cascading deletes
ALTER TABLE public.confirmations DROP CONSTRAINT IF EXISTS confirmations_user_id_fkey;
ALTER TABLE public.confirmations ADD CONSTRAINT confirmations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clear all confirmations to unblock user deletion
DELETE FROM public.confirmations;