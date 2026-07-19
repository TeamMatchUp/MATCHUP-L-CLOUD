-- Allow public reads for public image buckets so generated public URLs and upsert checks work.
DROP POLICY IF EXISTS "Public can read uploaded image buckets" ON storage.objects;
CREATE POLICY "Public can read uploaded image buckets"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('avatars', 'event-images', 'gym-images'));

-- Upsert uses an update path when a file already exists, so the replacement row must
-- also pass an explicit ownership check.
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Event organiser can update their event images" ON storage.objects;
CREATE POLICY "Event organiser can update their event images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.organiser_id = auth.uid()
      AND (
        split_part(storage.objects.name, '/', 1) = e.id::text
        OR split_part(storage.objects.name, '-', 1) = e.id::text
      )
  )
)
WITH CHECK (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.organiser_id = auth.uid()
      AND (
        split_part(storage.objects.name, '/', 1) = e.id::text
        OR split_part(storage.objects.name, '-', 1) = e.id::text
      )
  )
);

DROP POLICY IF EXISTS "Gym coach can update their gym images" ON storage.objects;
CREATE POLICY "Gym coach can update their gym images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gym-images'
  AND EXISTS (
    SELECT 1
    FROM public.gyms g
    WHERE g.coach_id = auth.uid()
      AND (
        split_part(storage.objects.name, '/', 1) = g.id::text
        OR split_part(storage.objects.name, '-', 1) = g.id::text
      )
  )
)
WITH CHECK (
  bucket_id = 'gym-images'
  AND EXISTS (
    SELECT 1
    FROM public.gyms g
    WHERE g.coach_id = auth.uid()
      AND (
        split_part(storage.objects.name, '/', 1) = g.id::text
        OR split_part(storage.objects.name, '-', 1) = g.id::text
      )
  )
);