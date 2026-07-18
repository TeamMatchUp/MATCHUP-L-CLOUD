
-- Allow organisers to create non-member fighter profiles they own (for matchmaking invites)
DROP POLICY IF EXISTS "Users can create their own or coach-owned fighter profiles" ON public.fighter_profiles;

CREATE POLICY "Users can create their own or coach-owned fighter profiles"
ON public.fighter_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'fighter'::app_role) AND user_id = auth.uid())
  OR (has_role(auth.uid(), 'coach'::app_role) AND created_by_coach_id = auth.uid())
  OR (has_role(auth.uid(), 'organiser'::app_role) AND created_by_coach_id = auth.uid() AND user_id IS NULL)
);

-- Allow organisers to update non-member fighter profiles they created (e.g. to edit before claim)
DROP POLICY IF EXISTS "Coaches can update fighters they created" ON public.fighter_profiles;
CREATE POLICY "Creators can update fighters they created"
ON public.fighter_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by_coach_id);
