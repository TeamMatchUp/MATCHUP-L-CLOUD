-- Allow users to read their own gym claims (needed for My Gyms query)
CREATE POLICY "Users can view their own gym claims"
ON public.gym_claims FOR SELECT TO authenticated
USING (auth.uid() = user_id);