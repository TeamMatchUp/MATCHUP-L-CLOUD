
-- Fix storage RLS for gym-images and event-images: UUIDs contain hyphens, so
-- split_part(name, '-', 1) returned only the first UUID segment, blocking
-- legitimate uploads. Switch to '/' separator and update the callers to match.

DROP POLICY IF EXISTS "Gym coach can upload gym images" ON storage.objects;
DROP POLICY IF EXISTS "Gym coach can update their gym images" ON storage.objects;
DROP POLICY IF EXISTS "Gym coach can delete their gym images" ON storage.objects;
DROP POLICY IF EXISTS "Organiser can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Event organiser can update their event images" ON storage.objects;
DROP POLICY IF EXISTS "Event organiser can delete their event images" ON storage.objects;

CREATE POLICY "Gym coach can upload gym images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gym-images' AND EXISTS (
      SELECT 1 FROM public.gyms g
      WHERE g.coach_id = auth.uid()
        AND (
          split_part(objects.name, '/', 1) = g.id::text
          OR split_part(objects.name, '-', 1) = g.id::text
        )
    )
  );

CREATE POLICY "Gym coach can update their gym images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'gym-images' AND EXISTS (
      SELECT 1 FROM public.gyms g
      WHERE g.coach_id = auth.uid()
        AND (
          split_part(objects.name, '/', 1) = g.id::text
          OR split_part(objects.name, '-', 1) = g.id::text
        )
    )
  );

CREATE POLICY "Gym coach can delete their gym images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'gym-images' AND EXISTS (
      SELECT 1 FROM public.gyms g
      WHERE g.coach_id = auth.uid()
        AND (
          split_part(objects.name, '/', 1) = g.id::text
          OR split_part(objects.name, '-', 1) = g.id::text
        )
    )
  );

CREATE POLICY "Organiser can upload event images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images' AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.organiser_id = auth.uid()
        AND (
          split_part(objects.name, '/', 1) = e.id::text
          OR split_part(objects.name, '-', 1) = e.id::text
        )
    )
  );

CREATE POLICY "Event organiser can update their event images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-images' AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.organiser_id = auth.uid()
        AND (
          split_part(objects.name, '/', 1) = e.id::text
          OR split_part(objects.name, '-', 1) = e.id::text
        )
    )
  );

CREATE POLICY "Event organiser can delete their event images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-images' AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.organiser_id = auth.uid()
        AND (
          split_part(objects.name, '/', 1) = e.id::text
          OR split_part(objects.name, '-', 1) = e.id::text
        )
    )
  );

-- Belt-and-braces: ensure avatars policies remain permissive for users to
-- upload their own files. Recreate as idempotent no-op if already correct.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
