
-- =========================================================
-- 1. user_roles: block self-assignment of admin
-- =========================================================
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
CREATE POLICY "Users can insert their own non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role <> 'admin'::app_role);

-- =========================================================
-- 2. fighter_profiles: hide email + date_of_birth from anon
-- =========================================================
REVOKE SELECT (email, date_of_birth) ON public.fighter_profiles FROM anon;
-- authenticated keeps access; app-layer/UI decides display

-- =========================================================
-- 3. approve_gym_claim: require admin
-- =========================================================
CREATE OR REPLACE FUNCTION public.approve_gym_claim(_claim_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _claim RECORD;
  _gym_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO _claim FROM public.gym_claims WHERE id = _claim_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  UPDATE public.gym_claims SET status = 'approved' WHERE id = _claim_id;

  UPDATE public.gyms
  SET claimed = true,
      coach_id = COALESCE(_claim.user_id, coach_id),
      listing_tier = CASE WHEN listing_tier = 'unclaimed' THEN 'free' ELSE listing_tier END
  WHERE id = _claim.gym_id;

  SELECT name INTO _gym_name FROM public.gyms WHERE id = _claim.gym_id;

  IF _claim.user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_claim.user_id, 'gym_owner')
    ON CONFLICT (user_id, role) DO NOTHING;

    PERFORM public.create_notification(
      _claim.user_id,
      'Your claim for ' || COALESCE(_gym_name, 'your gym') || ' has been approved',
      'Your claim for ' || COALESCE(_gym_name, 'your gym') || ' has been approved. The gym is now listed under your account.',
      'system'::notification_type,
      _claim.gym_id
    );
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.approve_gym_claim(uuid) FROM PUBLIC, anon;

-- =========================================================
-- 4. create_notification: no direct end-user access
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, notification_type, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, notification_type, uuid) TO service_role;

-- Also lock down other definer helpers that end users should never RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_fighter_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_claim_coach_gym() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_fighter_gym_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- =========================================================
-- 5. Trigger functions: set search_path
-- =========================================================
CREATE OR REPLACE FUNCTION public.auto_claim_coach_gym()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.coach_id IS NOT NULL AND NEW.claimed = false THEN
    NEW.claimed := true;
    NEW.listing_tier := 'free';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_fighter_gym_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE public.profiles
    SET gym_id = NEW.gym_id
    WHERE id = NEW.fighter_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- =========================================================
-- 6. event_fight_slots: is_public actually restricts
-- =========================================================
DROP POLICY IF EXISTS "Event fight slots viewable by anyone" ON public.event_fight_slots;
CREATE POLICY "Event fight slots viewable when public or by organiser"
ON public.event_fight_slots
FOR SELECT
TO public
USING (
  is_public = true
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_fight_slots.event_id AND e.organiser_id = auth.uid())
);

DROP POLICY IF EXISTS "Organisers can insert event fight slots" ON public.event_fight_slots;
CREATE POLICY "Organisers can insert event fight slots for their events"
ON public.event_fight_slots
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'organiser'::app_role)
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_fight_slots.event_id AND e.organiser_id = auth.uid())
);

DROP POLICY IF EXISTS "Organisers can update event fight slots" ON public.event_fight_slots;
CREATE POLICY "Organisers can update event fight slots for their events"
ON public.event_fight_slots
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'organiser'::app_role)
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_fight_slots.event_id AND e.organiser_id = auth.uid())
);

DROP POLICY IF EXISTS "Organisers can delete event fight slots" ON public.event_fight_slots;
CREATE POLICY "Organisers can delete event fight slots for their events"
ON public.event_fight_slots
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'organiser'::app_role)
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_fight_slots.event_id AND e.organiser_id = auth.uid())
);

-- =========================================================
-- 7. gym_profile_views: require caller matches viewer_user_id
-- =========================================================
DROP POLICY IF EXISTS "Anyone can insert gym profile views" ON public.gym_profile_views;
CREATE POLICY "Authenticated users can log their own gym views"
ON public.gym_profile_views
FOR INSERT
TO authenticated
WITH CHECK (viewer_user_id = auth.uid());

-- =========================================================
-- 8. match_proposals: scope UPDATE to involved parties
-- =========================================================
DROP POLICY IF EXISTS "Organisers can update match proposals" ON public.match_proposals;
DROP POLICY IF EXISTS "Fighters can update match proposals they are involved in" ON public.match_proposals;
CREATE POLICY "Involved parties can update match proposals"
ON public.match_proposals
FOR UPDATE
TO authenticated
USING (
  auth.uid() = proposed_by
  OR EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.id IN (match_proposals.fighter_a_id, match_proposals.fighter_b_id)
      AND (fp.user_id = auth.uid() OR fp.created_by_coach_id = auth.uid())
  )
);

-- =========================================================
-- 9. tickets: only owning organiser can write
-- =========================================================
DROP POLICY IF EXISTS "Organisers and gym owners can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Organisers and gym owners can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Organisers and gym owners can delete tickets" ON public.tickets;

CREATE POLICY "Owning organiser can insert tickets"
ON public.tickets FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = tickets.event_id AND e.organiser_id = auth.uid()));

CREATE POLICY "Owning organiser can update tickets"
ON public.tickets FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = tickets.event_id AND e.organiser_id = auth.uid()));

CREATE POLICY "Owning organiser can delete tickets"
ON public.tickets FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = tickets.event_id AND e.organiser_id = auth.uid()));

-- =========================================================
-- 10. fight_results: only owning organiser can write
-- =========================================================
DROP POLICY IF EXISTS "Organisers and gym owners can insert fight results" ON public.fight_results;
DROP POLICY IF EXISTS "Organisers and gym owners can update fight results" ON public.fight_results;

CREATE POLICY "Owning organiser can insert fight results"
ON public.fight_results FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = fight_results.event_id AND e.organiser_id = auth.uid()));

CREATE POLICY "Owning organiser can update fight results"
ON public.fight_results FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = fight_results.event_id AND e.organiser_id = auth.uid()));

-- =========================================================
-- 11. fighter_records: only linked gym coach or creating coach
-- =========================================================
DROP POLICY IF EXISTS "Gym owners can insert fighter records" ON public.fighter_records;
DROP POLICY IF EXISTS "Gym owners can update fighter records" ON public.fighter_records;

CREATE POLICY "Linked gym coach can insert fighter records"
ON public.fighter_records FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.id = fighter_records.fighter_id
      AND (
        fp.created_by_coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.fighter_gym_links fgl
          JOIN public.gyms g ON g.id = fgl.gym_id
          WHERE fgl.fighter_id = fp.id AND fgl.status = 'approved' AND g.coach_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Linked gym coach can update fighter records"
ON public.fighter_records FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.id = fighter_records.fighter_id
      AND (
        fp.created_by_coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.fighter_gym_links fgl
          JOIN public.gyms g ON g.id = fgl.gym_id
          WHERE fgl.fighter_id = fp.id AND fgl.status = 'approved' AND g.coach_id = auth.uid()
        )
      )
  )
);

-- =========================================================
-- 12. fight_slots: only owning organiser can write
-- =========================================================
DROP POLICY IF EXISTS "Organisers can manage fight slots" ON public.fight_slots;
DROP POLICY IF EXISTS "Organisers can update fight slots" ON public.fight_slots;
DROP POLICY IF EXISTS "Organisers can delete fight slots" ON public.fight_slots;

CREATE POLICY "Owning organiser can insert fight slots"
ON public.fight_slots FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = fight_slots.event_id AND e.organiser_id = auth.uid()));

CREATE POLICY "Owning organiser can update fight slots"
ON public.fight_slots FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = fight_slots.event_id AND e.organiser_id = auth.uid()));

CREATE POLICY "Owning organiser can delete fight slots"
ON public.fight_slots FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = fight_slots.event_id AND e.organiser_id = auth.uid()));

-- =========================================================
-- 13. Business-table SELECTs: only involved parties
-- =========================================================
DROP POLICY IF EXISTS "Match suggestions viewable by authenticated" ON public.match_suggestions;
CREATE POLICY "Match suggestions viewable by involved parties"
ON public.match_suggestions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = match_suggestions.event_id AND e.organiser_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.id IN (match_suggestions.fighter_a_id, match_suggestions.fighter_b_id)
      AND (fp.user_id = auth.uid() OR fp.created_by_coach_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Coaches can view their nominations" ON public.coach_event_nominations;
CREATE POLICY "Involved parties can view coach nominations"
ON public.coach_event_nominations FOR SELECT TO authenticated
USING (
  auth.uid() = coach_id
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = coach_event_nominations.event_id AND e.organiser_id = auth.uid())
);

DROP POLICY IF EXISTS "Confirmations viewable by authenticated users" ON public.confirmations;
CREATE POLICY "Confirmations viewable by involved parties"
ON public.confirmations FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.match_proposals mp
    WHERE mp.id = confirmations.match_proposal_id
      AND (
        mp.proposed_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.fighter_profiles fp
          WHERE fp.id IN (mp.fighter_a_id, mp.fighter_b_id)
            AND (fp.user_id = auth.uid() OR fp.created_by_coach_id = auth.uid())
        )
      )
  )
);

DROP POLICY IF EXISTS "Bout acceptances viewable by authenticated" ON public.bout_acceptances;
CREATE POLICY "Bout acceptances viewable by involved parties"
ON public.bout_acceptances FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.fight_slots fs
    JOIN public.events e ON e.id = fs.event_id
    WHERE fs.id = bout_acceptances.slot_id AND e.organiser_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Interests viewable by authenticated users" ON public.fighter_event_interests;
CREATE POLICY "Fighter event interests viewable by involved parties"
ON public.fighter_event_interests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.id = fighter_event_interests.fighter_id
      AND (fp.user_id = auth.uid() OR fp.created_by_coach_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = fighter_event_interests.event_id AND e.organiser_id = auth.uid())
);

-- =========================================================
-- 14. Storage: scope update/delete on event & gym images by owner path prefix
--     (upload path convention: [entityId]-[type]-[timestamp].[ext])
-- =========================================================
DROP POLICY IF EXISTS "Authenticated update event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update gym images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete gym images" ON storage.objects;

CREATE POLICY "Event organiser can update their event images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.organiser_id = auth.uid()
      AND split_part(storage.objects.name, '-', 1) = e.id::text
  )
);

CREATE POLICY "Event organiser can delete their event images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.organiser_id = auth.uid()
      AND split_part(storage.objects.name, '-', 1) = e.id::text
  )
);

CREATE POLICY "Gym coach can update their gym images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'gym-images'
  AND EXISTS (
    SELECT 1 FROM public.gyms g
    WHERE g.coach_id = auth.uid()
      AND split_part(storage.objects.name, '-', 1) = g.id::text
  )
);

CREATE POLICY "Gym coach can delete their gym images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'gym-images'
  AND EXISTS (
    SELECT 1 FROM public.gyms g
    WHERE g.coach_id = auth.uid()
      AND split_part(storage.objects.name, '-', 1) = g.id::text
  )
);

-- =========================================================
-- 15. Storage: prevent public listing of image buckets
--     (direct public URLs still resolve because buckets are public)
-- =========================================================
DROP POLICY IF EXISTS "Public read event images" ON storage.objects;
DROP POLICY IF EXISTS "Public read gym images" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
