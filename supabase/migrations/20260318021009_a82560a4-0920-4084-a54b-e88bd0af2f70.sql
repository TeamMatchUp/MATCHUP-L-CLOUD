
CREATE TABLE public.gym_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  claimant_name text NOT NULL,
  claimant_email text NOT NULL,
  claimant_role text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit gym claims"
  ON public.gym_claims
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view gym claims"
  ON public.gym_claims
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
