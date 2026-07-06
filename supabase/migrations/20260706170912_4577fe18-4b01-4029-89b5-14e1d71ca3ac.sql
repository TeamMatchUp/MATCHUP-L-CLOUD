
-- Fix: profiles_public_exposure — restrict SELECT to owner only
DROP POLICY IF EXISTS "Anonymous can view public profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Fix: fighter_profiles_visibility_bypass + fighter_visibility_bypass
DROP POLICY IF EXISTS "Anonymous users can view fighter profiles" ON public.fighter_profiles;
DROP POLICY IF EXISTS "Authenticated users can view fighter profiles" ON public.fighter_profiles;

CREATE POLICY "Public fighter profiles viewable by anon"
ON public.fighter_profiles FOR SELECT TO anon
USING (visibility = 'public');

CREATE POLICY "Fighter profiles viewable per visibility"
ON public.fighter_profiles FOR SELECT TO authenticated
USING (
  visibility = 'public'
  OR user_id = auth.uid()
  OR created_by_coach_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.fighter_gym_links fgl
    JOIN public.gyms g ON g.id = fgl.gym_id
    WHERE fgl.fighter_id = fighter_profiles.id
      AND fgl.status = 'approved'
      AND g.coach_id = auth.uid()
  )
);

-- Fix: result_verifications_insert_spoofing
DROP POLICY IF EXISTS "Authenticated users can insert verifications" ON public.result_verifications;
CREATE POLICY "Users can insert their own verifications"
ON public.result_verifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = verifier_id);

-- Fix: SUPA_(anon|authenticated)_security_definer_function_executable
-- Revoke EXECUTE on all SECURITY DEFINER functions from anon/authenticated.
-- Then re-grant EXECUTE only to functions intentionally callable via RPC.
REVOKE EXECUTE ON FUNCTION public.set_fighter_gym_on_approval() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_gym_claim(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_fighter_on_signup() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, public.notification_type, uuid) FROM anon, authenticated, PUBLIC;

-- Re-grant EXECUTE only for functions that must be RPC-callable by signed-in users.
-- has_role is used inside RLS expressions — RLS evaluates as the caller, so authenticated needs EXECUTE.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_gym_claim(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, public.notification_type, uuid) TO authenticated;
