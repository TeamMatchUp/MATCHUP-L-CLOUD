CREATE OR REPLACE FUNCTION public.sync_fighter_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _fighter_id uuid;
  _coach_id uuid;
  _fighter_name text;
  _gym_name text;
  _gym_record RECORD;
BEGIN
  -- If a fighter_profile exists with this email and no user_id, link it
  UPDATE public.fighter_profiles
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL
  RETURNING id, name, created_by_coach_id INTO _fighter_id, _fighter_name, _coach_id;

  -- If a profile was linked, auto-assign the fighter role
  IF _fighter_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'fighter')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Notify the fighter about each gym they belong to
    FOR _gym_record IN
      SELECT g.name AS gym_name, g.id AS gym_id
      FROM public.fighter_gym_links fgl
      JOIN public.gyms g ON g.id = fgl.gym_id
      WHERE fgl.fighter_id = _fighter_id
    LOOP
      PERFORM public.create_notification(
        NEW.id,
        'Welcome to ' || _gym_record.gym_name,
        'Your coach added you to ' || _gym_record.gym_name || '''s roster. Check your dashboard for details.',
        'system'::notification_type,
        _gym_record.gym_id
      );
    END LOOP;

    -- Notify the coach that the fighter has signed up
    IF _coach_id IS NOT NULL THEN
      PERFORM public.create_notification(
        _coach_id,
        _fighter_name || ' has signed up',
        _fighter_name || ' created an account and has been synced to your roster.',
        'system'::notification_type,
        _fighter_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;