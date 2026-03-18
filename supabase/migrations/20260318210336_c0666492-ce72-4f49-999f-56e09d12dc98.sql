
-- RLS policy: Fighters can insert self-reported fights
CREATE POLICY "Fighters can insert self_reported fights"
ON public.fights
FOR INSERT
TO public
WITH CHECK (
  has_role(auth.uid(), 'fighter'::app_role)
  AND verification_status = 'self_reported'::fight_verification_status
);

-- RLS policy: Fighters can update their own self-reported fights
CREATE POLICY "Fighters can update self_reported fights"
ON public.fights
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'fighter'::app_role)
  AND verification_status = 'self_reported'::fight_verification_status
  AND (
    fighter_a_id IN (SELECT id FROM fighter_profiles WHERE user_id = auth.uid())
    OR fighter_b_id IN (SELECT id FROM fighter_profiles WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'fighter'::app_role)
  AND verification_status = 'self_reported'::fight_verification_status
);

-- RLS policy: Fighters can delete their own self-reported fights
CREATE POLICY "Fighters can delete self_reported fights"
ON public.fights
FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'fighter'::app_role)
  AND verification_status = 'self_reported'::fight_verification_status
  AND (
    fighter_a_id IN (SELECT id FROM fighter_profiles WHERE user_id = auth.uid())
    OR fighter_b_id IN (SELECT id FROM fighter_profiles WHERE user_id = auth.uid())
  )
);
