
-- Allow coaches to delete fighter profiles they created
CREATE POLICY "Coaches can delete fighters they created"
  ON public.fighter_profiles FOR DELETE
  USING (auth.uid() = created_by_coach_id);

-- Allow coaches to update fighter_gym_links for their gyms
CREATE POLICY "Coaches can update gym links for their gyms"
  ON public.fighter_gym_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gyms
      WHERE gyms.id = fighter_gym_links.gym_id
      AND gyms.coach_id = auth.uid()
    )
  );

-- Allow coaches to delete gym links for their gyms
CREATE POLICY "Coaches can delete gym links for their gyms"
  ON public.fighter_gym_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.gyms
      WHERE gyms.id = fighter_gym_links.gym_id
      AND gyms.coach_id = auth.uid()
    )
  );
