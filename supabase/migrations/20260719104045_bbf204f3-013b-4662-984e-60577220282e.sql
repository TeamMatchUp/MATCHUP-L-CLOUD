
ALTER TABLE public.fighter_profiles
  ADD COLUMN IF NOT EXISTS elo_rating integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS elo_last_computed_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_consented_matchmaking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS matchmaking_consent_version integer,
  ADD COLUMN IF NOT EXISTS matchmaking_consent_at timestamptz;

CREATE OR REPLACE FUNCTION public.record_matchmaking_consent(_version integer)
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
  IF _version IS NULL OR _version < 1 THEN
    RAISE EXCEPTION 'invalid consent version';
  END IF;

  UPDATE public.profiles
     SET has_consented_matchmaking = true,
         matchmaking_consent_version = _version,
         matchmaking_consent_at = now()
   WHERE id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.record_matchmaking_consent(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_matchmaking_consent(integer) TO authenticated;
