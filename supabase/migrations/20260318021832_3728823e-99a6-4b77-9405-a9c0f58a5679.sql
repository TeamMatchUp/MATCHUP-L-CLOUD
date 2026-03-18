
-- Allow admins to update gym_claims (approve/reject)
CREATE POLICY "Admins can update gym claims"
ON public.gym_claims
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any gym (for setting claimed/listing_tier)
CREATE POLICY "Admins can update any gym"
ON public.gyms
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
