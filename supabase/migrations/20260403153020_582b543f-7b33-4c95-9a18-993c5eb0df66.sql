
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read follows" ON public.user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own follows" ON public.user_follows
  FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete own follows" ON public.user_follows
  FOR DELETE TO authenticated USING (follower_id = auth.uid());
