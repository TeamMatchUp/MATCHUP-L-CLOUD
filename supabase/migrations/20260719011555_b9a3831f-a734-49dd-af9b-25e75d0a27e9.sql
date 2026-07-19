
-- 0. Update has_role to also honour JWT app_metadata admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      _user_id = auth.uid()
      AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND (
          role = _role
          OR role = 'admin'
          OR (role = 'gym_owner' AND _role IN ('organiser'::app_role, 'fighter'::app_role, 'coach'::app_role))
        )
    )
$$;

-- 1. Columns
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 2. Backfill existing rows to approved so nothing public disappears
UPDATE public.gyms SET review_status = 'approved' WHERE review_status = 'pending';
UPDATE public.events SET review_status = 'approved' WHERE review_status = 'pending';

CREATE INDEX IF NOT EXISTS gyms_review_status_idx ON public.gyms(review_status);
CREATE INDEX IF NOT EXISTS events_review_status_idx ON public.events(review_status);

-- 3. Replace SELECT policies to enforce visibility
DROP POLICY IF EXISTS "Gyms are viewable by everyone" ON public.gyms;
CREATE POLICY "Gyms are viewable when approved or by owner/admin"
  ON public.gyms FOR SELECT
  USING (
    review_status = 'approved'
    OR auth.uid() = coach_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable when approved+published or by owner/admin"
  ON public.events FOR SELECT
  USING (
    (status = 'published'::event_status AND review_status = 'approved')
    OR auth.uid() = organiser_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Admin approve/reject RPCs
CREATE OR REPLACE FUNCTION public.approve_gym(_gym_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gym RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.gyms
     SET review_status = 'approved',
         review_reason = NULL,
         reviewed_at = now()
   WHERE id = _gym_id
  RETURNING * INTO _gym;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gym not found';
  END IF;

  IF _gym.coach_id IS NOT NULL THEN
    PERFORM public.create_notification(
      _gym.coach_id,
      _gym.name || ' is now live',
      'Your gym "' || _gym.name || '" has been approved and is now visible on Explore.',
      'system'::notification_type,
      _gym.id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_gym(_gym_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gym RECORD;
  _msg text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.gyms
     SET review_status = 'rejected',
         review_reason = _reason,
         reviewed_at = now()
   WHERE id = _gym_id
  RETURNING * INTO _gym;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gym not found';
  END IF;

  _msg := 'Your gym "' || _gym.name || '" was not approved.';
  IF _reason IS NOT NULL AND length(trim(_reason)) > 0 THEN
    _msg := _msg || ' Reason: ' || _reason;
  END IF;

  IF _gym.coach_id IS NOT NULL THEN
    PERFORM public.create_notification(
      _gym.coach_id,
      'Gym submission not approved',
      _msg,
      'system'::notification_type,
      _gym.id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_event(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.events
     SET review_status = 'approved',
         review_reason = NULL,
         reviewed_at = now()
   WHERE id = _event_id
  RETURNING * INTO _event;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF _event.organiser_id IS NOT NULL THEN
    PERFORM public.create_notification(
      _event.organiser_id,
      _event.title || ' is now live',
      'Your event "' || _event.title || '" has been approved. Publish it to make it visible on Explore.',
      'system'::notification_type,
      _event.id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_event(_event_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event RECORD;
  _msg text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.events
     SET review_status = 'rejected',
         review_reason = _reason,
         reviewed_at = now()
   WHERE id = _event_id
  RETURNING * INTO _event;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  _msg := 'Your event "' || _event.title || '" was not approved.';
  IF _reason IS NOT NULL AND length(trim(_reason)) > 0 THEN
    _msg := _msg || ' Reason: ' || _reason;
  END IF;

  IF _event.organiser_id IS NOT NULL THEN
    PERFORM public.create_notification(
      _event.organiser_id,
      'Event submission not approved',
      _msg,
      'system'::notification_type,
      _event.id
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_gym(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_gym(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_event(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_event(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_gym(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_gym(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_event(uuid, text) TO authenticated;
