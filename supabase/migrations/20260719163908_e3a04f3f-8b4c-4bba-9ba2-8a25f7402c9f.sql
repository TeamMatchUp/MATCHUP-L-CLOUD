
-- Profile extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS responsible_person_name text,
  ADD COLUMN IF NOT EXISTS responsible_person_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS responsible_person_confirmed_version integer;

-- Backfill DOB from fighter_profiles where linked
UPDATE public.profiles p
   SET date_of_birth = fp.date_of_birth
  FROM public.fighter_profiles fp
 WHERE fp.user_id = p.id
   AND fp.date_of_birth IS NOT NULL
   AND p.date_of_birth IS NULL;

-- Social URL on fighter_profiles
ALTER TABLE public.fighter_profiles
  ADD COLUMN IF NOT EXISTS social_url text;

-- is_minor: fail-safe true when unknown
CREATE OR REPLACE FUNCTION public.is_minor(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dob date;
  _found boolean;
BEGIN
  SELECT date_of_birth, true
    INTO _dob, _found
    FROM public.profiles
   WHERE id = _uid;

  IF NOT COALESCE(_found, false) THEN
    RETURN true; -- no profile row: treat as minor
  END IF;

  IF _dob IS NULL THEN
    RETURN true; -- unknown DOB: treat as minor
  END IF;

  RETURN age(current_date, _dob) < interval '18 years';
END;
$$;

REVOKE ALL ON FUNCTION public.is_minor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_minor(uuid) TO authenticated, service_role;

-- RPC: user records their own DOB
CREATE OR REPLACE FUNCTION public.record_date_of_birth(_dob date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _dob IS NULL THEN
    RAISE EXCEPTION 'date_of_birth required';
  END IF;
  IF _dob > current_date THEN
    RAISE EXCEPTION 'date_of_birth cannot be in the future';
  END IF;

  UPDATE public.profiles
     SET date_of_birth = _dob
   WHERE id = _uid;

  -- Also propagate to fighter_profiles if present
  UPDATE public.fighter_profiles
     SET date_of_birth = _dob
   WHERE user_id = _uid
     AND (date_of_birth IS NULL OR date_of_birth <> _dob);
END;
$$;

REVOKE ALL ON FUNCTION public.record_date_of_birth(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_date_of_birth(date) TO authenticated;

-- RPC: user records responsible person attestation
CREATE OR REPLACE FUNCTION public.record_responsible_person(_name text, _version integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _name IS NULL OR length(trim(_name)) < 2 THEN
    RAISE EXCEPTION 'responsible_person_name required';
  END IF;

  UPDATE public.profiles
     SET responsible_person_name = trim(_name),
         responsible_person_confirmed_at = now(),
         responsible_person_confirmed_version = COALESCE(_version, 1)
   WHERE id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.record_responsible_person(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_responsible_person(text, integer) TO authenticated;
