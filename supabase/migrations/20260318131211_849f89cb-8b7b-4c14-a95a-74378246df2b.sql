
-- Add user_id to gym_claims
ALTER TABLE public.gym_claims ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Allow authenticated users to insert claims with their user_id
DROP POLICY IF EXISTS "Anyone can submit gym claims" ON public.gym_claims;
CREATE POLICY "Authenticated users can submit gym claims"
ON public.gym_claims FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
