DROP POLICY IF EXISTS "Coaches can create their own gyms" ON public.gyms;
CREATE POLICY "Coaches can create their own gyms"
ON public.gyms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = coach_id);