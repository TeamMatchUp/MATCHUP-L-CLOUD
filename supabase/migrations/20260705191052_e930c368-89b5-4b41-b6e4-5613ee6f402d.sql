
CREATE TABLE public.gym_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gym_gallery_images_gym ON public.gym_gallery_images(gym_id, sort_order);

GRANT SELECT ON public.gym_gallery_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gym_gallery_images TO authenticated;
GRANT ALL ON public.gym_gallery_images TO service_role;

ALTER TABLE public.gym_gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gym gallery"
  ON public.gym_gallery_images FOR SELECT
  USING (true);

CREATE POLICY "Gym owner can insert gallery images"
  ON public.gym_gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.gyms g WHERE g.id = gym_id AND g.coach_id = auth.uid()));

CREATE POLICY "Gym owner can update gallery images"
  ON public.gym_gallery_images FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gyms g WHERE g.id = gym_id AND g.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gyms g WHERE g.id = gym_id AND g.coach_id = auth.uid()));

CREATE POLICY "Gym owner can delete gallery images"
  ON public.gym_gallery_images FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gyms g WHERE g.id = gym_id AND g.coach_id = auth.uid()));
