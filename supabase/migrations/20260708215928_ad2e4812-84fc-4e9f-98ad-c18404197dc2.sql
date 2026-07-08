
-- 1) Fix gym-images upload policy: check the uploaded object path, not the gym name
DROP POLICY IF EXISTS "Gym coach can upload gym images" ON storage.objects;
CREATE POLICY "Gym coach can upload gym images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'gym-images'
  AND EXISTS (
    SELECT 1 FROM public.gyms g
    WHERE g.coach_id = auth.uid()
      AND split_part(objects.name, '-', 1) = g.id::text
  )
);

-- 2) Fix event_boosts INSERT to require event ownership
DROP POLICY IF EXISTS "Organisers can insert boosts for their own events" ON public.event_boosts;
CREATE POLICY "Organisers can insert boosts for their own events"
ON public.event_boosts FOR INSERT TO authenticated
WITH CHECK (
  purchased_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_boosts.event_id
      AND e.organiser_id = auth.uid()
  )
);

-- 3) create_notification: revoke from authenticated/anon/PUBLIC.
--    The function already blocks cross-user calls internally; it is only used
--    legitimately from SECURITY DEFINER triggers and backend/service_role paths.
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, notification_type, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, notification_type, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, notification_type, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, notification_type, uuid) TO service_role;

-- 4) Revoke SECURITY DEFINER function EXECUTE from anon (they are never called by
--    unauthenticated visitors). Keep authenticated grants where required by RLS
--    policies (has_role, get_user_roles) or by first-run signup flows.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_gym_claim(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_signup_role(app_role) FROM PUBLIC, anon;
