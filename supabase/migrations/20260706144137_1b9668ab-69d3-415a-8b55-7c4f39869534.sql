
-- ============================================================
-- 1. FIGHT_SLOTS: drop over-broad UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Coaches can update fight slots for declined matches" ON public.fight_slots;
DROP POLICY IF EXISTS "Fighters can update fight slots for declined matches" ON public.fight_slots;

-- ============================================================
-- 2. FIGHTER_GYM_LINKS: replace unscoped INSERT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "Coaches and fighters can manage gym links" ON public.fighter_gym_links;
DROP POLICY IF EXISTS "Coaches and fighters can delete gym links" ON public.fighter_gym_links;
DROP POLICY IF EXISTS "Gym owners can update gym links" ON public.fighter_gym_links;

-- Fighter can request membership (only for their own profile, only as pending)
CREATE POLICY "Fighters can request gym membership"
  ON public.fighter_gym_links FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.fighter_profiles fp
      WHERE fp.id = fighter_id AND fp.user_id = auth.uid()
    )
  );

-- Coach can link a fighter to a gym they own
CREATE POLICY "Coaches can link fighters to their gyms"
  ON public.fighter_gym_links FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gyms g
      WHERE g.id = gym_id AND g.coach_id = auth.uid()
    )
  );

-- Coach can also link a fighter they created (imports/onboarding)
CREATE POLICY "Coaches can link fighters they created"
  ON public.fighter_gym_links FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.fighter_profiles fp
      WHERE fp.id = fighter_id AND fp.created_by_coach_id = auth.uid()
    )
  );

-- Gym owner can update links for their own gyms (approve/decline)
CREATE POLICY "Gym owners can update links for their gyms"
  ON public.fighter_gym_links FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gyms g
      WHERE g.id = gym_id AND g.coach_id = auth.uid()
    )
  );

-- Coach/fighter can delete their own links (existing scoped delete policies remain)
CREATE POLICY "Coaches can delete links they created"
  ON public.fighter_gym_links FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fighter_profiles fp
      WHERE fp.id = fighter_id AND fp.created_by_coach_id = auth.uid()
    )
  );

-- ============================================================
-- 3. FIGHTER_PROFILES: remove blanket public SELECT
-- Sensitive columns (email, date_of_birth, postcode) shouldn't be public
-- ============================================================
DROP POLICY IF EXISTS "Fighter profiles are viewable by everyone" ON public.fighter_profiles;

-- Authenticated users can view fighter profiles
CREATE POLICY "Authenticated users can view fighter profiles"
  ON public.fighter_profiles FOR SELECT TO authenticated
  USING (true);

-- Anonymous visitors: also grant read via column-level access (below)
-- Keep RLS pass for anon on non-sensitive rows
CREATE POLICY "Anonymous users can view fighter profiles"
  ON public.fighter_profiles FOR SELECT TO anon
  USING (true);

-- Revoke sensitive columns from anon at the column level
REVOKE SELECT (email, date_of_birth, postcode) ON public.fighter_profiles FROM anon;

-- ============================================================
-- 4. PROFILES: restrict public SELECT
-- ============================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Allow anon to see minimal public columns (name/avatar) via column grants
CREATE POLICY "Anonymous can view public profile fields"
  ON public.profiles FOR SELECT TO anon
  USING (true);

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, gym_id) ON public.profiles TO anon;

-- ============================================================
-- 5. MATCH_PROPOSALS: scope SELECT to involved parties only
-- ============================================================
DROP POLICY IF EXISTS "Match proposals viewable by involved parties" ON public.match_proposals;

CREATE POLICY "Match proposals viewable by involved parties"
  ON public.match_proposals FOR SELECT TO authenticated
  USING (
    auth.uid() = proposed_by
    OR EXISTS (
      SELECT 1 FROM public.fighter_profiles fp
      WHERE fp.id = ANY (ARRAY[fighter_a_id, fighter_b_id])
        AND (fp.user_id = auth.uid() OR fp.created_by_coach_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.fighter_profiles fp
      JOIN public.fighter_gym_links fgl ON fgl.fighter_id = fp.id AND fgl.status = 'approved'
      JOIN public.gyms g ON g.id = fgl.gym_id
      WHERE fp.id = ANY (ARRAY[fighter_a_id, fighter_b_id])
        AND g.coach_id = auth.uid()
    )
  );

-- ============================================================
-- 6. STORAGE: scope event/gym image uploads to owners
-- ============================================================
DROP POLICY IF EXISTS "Authenticated upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload gym images" ON storage.objects;

CREATE POLICY "Organiser can upload event images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.organiser_id = auth.uid()
        AND split_part(name, '-', 1) = e.id::text
    )
  );

CREATE POLICY "Gym coach can upload gym images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gym-images'
    AND EXISTS (
      SELECT 1 FROM public.gyms g
      WHERE g.coach_id = auth.uid()
        AND split_part(name, '-', 1) = g.id::text
    )
  );

-- ============================================================
-- 7. SECURITY DEFINER functions: restrict EXECUTE
-- Revoke from public/anon on internal helpers; keep for authenticated
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, notification_type, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_gym_claim(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;

-- Grant back to authenticated where RLS/app code needs it
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_gym_claim(uuid) TO authenticated;
