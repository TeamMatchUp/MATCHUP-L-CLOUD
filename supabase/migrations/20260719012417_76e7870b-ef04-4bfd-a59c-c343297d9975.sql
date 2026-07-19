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

  -- Allow when: service_role (no auth.uid), self-notify, or caller is admin.
  IF _caller IS NOT NULL
     AND _caller <> _user_id
     AND NOT public.has_role(_caller, 'admin'::app_role) THEN
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