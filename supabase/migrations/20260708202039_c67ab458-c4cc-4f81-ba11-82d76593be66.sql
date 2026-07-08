CREATE OR REPLACE FUNCTION public.assign_signup_role(_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid;
  _existing_count int;
BEGIN
  _caller := auth.uid();
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _role = 'admin'::app_role THEN
    RAISE EXCEPTION 'cannot self-assign admin role';
  END IF;

  SELECT COUNT(*) INTO _existing_count FROM public.user_roles WHERE user_id = _caller;
  IF _existing_count > 0 THEN
    RAISE EXCEPTION 'roles already assigned';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_caller, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_signup_role(app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_signup_role(app_role) TO authenticated;