-- Create event-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gym-images
CREATE POLICY "Public read gym images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gym-images');

CREATE POLICY "Authenticated upload gym images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gym-images');

CREATE POLICY "Authenticated delete gym images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'gym-images');

CREATE POLICY "Authenticated update gym images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'gym-images');

-- Storage policies for event-images
CREATE POLICY "Public read event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated upload event images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Authenticated delete event images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated update event images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-images');