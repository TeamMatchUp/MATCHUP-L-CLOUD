
-- 1. Create a SECURITY DEFINER function to atomically approve a gym claim
CREATE OR REPLACE FUNCTION public.approve_gym_claim(_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _claim RECORD;
  _gym_name text;
BEGIN
  -- Fetch the claim
  SELECT * INTO _claim FROM public.gym_claims WHERE id = _claim_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  -- Update claim status
  UPDATE public.gym_claims SET status = 'approved' WHERE id = _claim_id;

  -- Update gym: set claimed, coach_id, and listing_tier
  UPDATE public.gyms
  SET claimed = true,
      coach_id = COALESCE(_claim.user_id, coach_id),
      listing_tier = CASE WHEN listing_tier = 'unclaimed' THEN 'free' ELSE listing_tier END
  WHERE id = _claim.gym_id;

  -- Get gym name for notification
  SELECT name INTO _gym_name FROM public.gyms WHERE id = _claim.gym_id;

  -- Grant gym_owner role if not already present
  IF _claim.user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_claim.user_id, 'gym_owner')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Send notification
    PERFORM public.create_notification(
      _claim.user_id,
      'Your claim for ' || COALESCE(_gym_name, 'your gym') || ' has been approved',
      'Your claim for ' || COALESCE(_gym_name, 'your gym') || ' has been approved. The gym is now listed under your account.',
      'system'::notification_type,
      _claim.gym_id
    );
  END IF;
END;
$$;

-- 2. Retroactively fix all approved claims where gym wasn't updated
DO $$
DECLARE
  _claim RECORD;
BEGIN
  FOR _claim IN
    SELECT gc.*, g.claimed AS gym_claimed, g.coach_id AS gym_coach_id
    FROM public.gym_claims gc
    JOIN public.gyms g ON g.id = gc.gym_id
    WHERE gc.status = 'approved'
      AND (g.claimed = false OR g.claimed IS NULL OR g.coach_id IS NULL)
  LOOP
    UPDATE public.gyms
    SET claimed = true,
        coach_id = COALESCE(_claim.user_id, coach_id),
        listing_tier = CASE WHEN listing_tier = 'unclaimed' THEN 'free' ELSE listing_tier END
    WHERE id = _claim.gym_id;

    -- Grant gym_owner role
    IF _claim.user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (_claim.user_id, 'gym_owner')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
