
-- 1. user_roles: only allow self-assigning 'fighter'
DROP POLICY IF EXISTS "Users can insert their own non-admin roles" ON public.user_roles;
CREATE POLICY "Users can insert only fighter role for themselves"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'fighter'::app_role);

-- 2. fighter_profiles: enforce ownership on insert
DROP POLICY IF EXISTS "Coaches can create fighter profiles" ON public.fighter_profiles;
CREATE POLICY "Users can create their own or coach-owned fighter profiles"
ON public.fighter_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'fighter'::app_role) AND user_id = auth.uid())
  OR (has_role(auth.uid(), 'coach'::app_role) AND created_by_coach_id = auth.uid())
);

-- 3. gyms: enforce coach_id = auth.uid()
DROP POLICY IF EXISTS "Coaches can create gyms" ON public.gyms;
CREATE POLICY "Coaches can create their own gyms"
ON public.gyms
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'coach'::app_role) AND coach_id = auth.uid());

-- 4. fights: event_verified inserts require event ownership
DROP POLICY IF EXISTS "Organisers can insert event_verified fights" ON public.fights;
CREATE POLICY "Organisers can insert event_verified fights for their events"
ON public.fights
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'organiser'::app_role)
  AND verification_status = 'event_verified'::fight_verification_status
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = fights.event_id AND e.organiser_id = auth.uid()
  )
);

-- 5. match_suggestions: enforce event ownership
DROP POLICY IF EXISTS "Organisers can insert match suggestions" ON public.match_suggestions;
DROP POLICY IF EXISTS "Organisers can update match suggestions" ON public.match_suggestions;
DROP POLICY IF EXISTS "Organisers can delete match suggestions" ON public.match_suggestions;

CREATE POLICY "Organisers insert match suggestions for their events"
ON public.match_suggestions
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'organiser'::app_role)
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = match_suggestions.event_id AND e.organiser_id = auth.uid())
);

CREATE POLICY "Organisers update match suggestions for their events"
ON public.match_suggestions
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'organiser'::app_role)
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = match_suggestions.event_id AND e.organiser_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'organiser'::app_role)
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = match_suggestions.event_id AND e.organiser_id = auth.uid())
);

CREATE POLICY "Organisers delete match suggestions for their events"
ON public.match_suggestions
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'organiser'::app_role)
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = match_suggestions.event_id AND e.organiser_id = auth.uid())
);

-- 6. match_proposals: enforce ownership via fight_slot -> event
DROP POLICY IF EXISTS "Organisers can create match proposals" ON public.match_proposals;
CREATE POLICY "Organisers create match proposals for their events"
ON public.match_proposals
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'organiser'::app_role)
  AND auth.uid() = proposed_by
  AND EXISTS (
    SELECT 1 FROM public.fight_slots fs
    JOIN public.events e ON e.id = fs.event_id
    WHERE fs.id = match_proposals.fight_slot_id AND e.organiser_id = auth.uid()
  )
);

-- 7. create_notification: authorize caller
CREATE OR REPLACE FUNCTION public.create_notification(_user_id uuid, _title text, _message text DEFAULT NULL::text, _type notification_type DEFAULT 'system'::notification_type, _reference_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _pref_match_proposals boolean;
  _pref_match_updates boolean;
  _pref_event_updates boolean;
  _pref_system boolean;
  _caller uuid;
BEGIN
  _caller := auth.uid();

  -- Only allow when: called with service_role (no auth.uid), or the caller is notifying themselves.
  IF _caller IS NOT NULL AND _caller <> _user_id THEN
    RAISE EXCEPTION 'not authorized to create notifications for another user';
  END IF;

  SELECT
    notification_match_proposals,
    notification_match_updates,
    notification_event_updates,
    notification_system
  INTO
    _pref_match_proposals,
    _pref_match_updates,
    _pref_event_updates,
    _pref_system
  FROM public.profiles
  WHERE id = _user_id;

  _pref_match_proposals := COALESCE(_pref_match_proposals, true);
  _pref_match_updates   := COALESCE(_pref_match_updates, true);
  _pref_event_updates   := COALESCE(_pref_event_updates, true);
  _pref_system          := COALESCE(_pref_system, true);

  IF _type = 'match_proposed' AND NOT _pref_match_proposals THEN
    RETURN NULL;
  END IF;
  IF _type IN ('match_accepted', 'match_declined', 'match_confirmed', 'match_withdrawn') AND NOT _pref_match_updates THEN
    RETURN NULL;
  END IF;
  IF _type = 'event_update' AND NOT _pref_event_updates THEN
    RETURN NULL;
  END IF;
  IF _type = 'system' AND NOT _pref_system THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES (_user_id, _title, _message, _type, _reference_id)
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;

-- 8. Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions; grant selectively
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, notification_type, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_fighter_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_fighter_gym_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_gym_claim(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon, authenticated;

-- has_role is used by RLS policies and must remain executable by authenticated
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;

-- Admin-only RPC still callable by authenticated (has admin check inside)
GRANT EXECUTE ON FUNCTION public.approve_gym_claim(uuid) TO authenticated;
