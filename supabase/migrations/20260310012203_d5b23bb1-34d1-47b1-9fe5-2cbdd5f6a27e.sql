CREATE TABLE public.ad_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  company_name text NOT NULL,
  company_website text,
  proposal text NOT NULL,
  budget_range text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_enquiries ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous) to insert enquiries
CREATE POLICY "Anyone can submit ad enquiries"
  ON public.ad_enquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins can view enquiries
CREATE POLICY "Admins can view ad enquiries"
  ON public.ad_enquiries
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));