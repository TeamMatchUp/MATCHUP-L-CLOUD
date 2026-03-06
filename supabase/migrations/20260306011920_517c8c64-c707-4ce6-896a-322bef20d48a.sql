
-- Security definer function to create notifications for any user
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title text,
  _message text DEFAULT NULL,
  _type notification_type DEFAULT 'system',
  _reference_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES (_user_id, _title, _message, _type, _reference_id)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Allow coaches and fighters to update match_proposals status (for accept/decline flow)
CREATE POLICY "Fighters can update match proposals they are involved in"
ON public.match_proposals
FOR UPDATE
USING (
  has_role(auth.uid(), 'fighter'::app_role)
);
