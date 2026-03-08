-- Allow fighters to update their own gym links (accept/decline invites)
CREATE POLICY "Fighters can update their own gym links"
ON public.fighter_gym_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.id = fighter_gym_links.fighter_id
    AND fp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.id = fighter_gym_links.fighter_id
    AND fp.user_id = auth.uid()
  )
);

-- Allow fighters to delete their own gym links (decline invites)
CREATE POLICY "Fighters can delete their own gym links"
ON public.fighter_gym_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.id = fighter_gym_links.fighter_id
    AND fp.user_id = auth.uid()
  )
);