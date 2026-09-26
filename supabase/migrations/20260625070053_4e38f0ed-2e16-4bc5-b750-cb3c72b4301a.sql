
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

-- ============ BLOCKS (first, referenced by messages policy) ============
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own blocks" ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "Users create own blocks" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users delete own blocks" ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- ============ CONVERSATIONS ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  joiner_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, joiner_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view conv" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = joiner_id OR auth.uid() = owner_id);
CREATE POLICY "Joiner creates conv" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = joiner_id AND auth.uid() <> owner_id);
CREATE POLICY "Participants update conv" ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = joiner_id OR auth.uid() = owner_id);

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id
                  AND (c.joiner_id = auth.uid() OR c.owner_id = auth.uid())));

CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id
              AND (c.joiner_id = auth.uid() OR c.owner_id = auth.uid())) AND
    NOT EXISTS (
      SELECT 1 FROM public.blocks b
      JOIN public.conversations c ON c.id = messages.conversation_id
      WHERE (b.blocker_id = c.owner_id AND b.blocked_id = c.joiner_id)
         OR (b.blocker_id = c.joiner_id AND b.blocked_id = c.owner_id)
    )
  );

CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_bump_conversation AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid,
  reported_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reported_user_id IS NOT NULL OR reported_listing_id IS NOT NULL)
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "Users create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- ============ RATINGS ============
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL,
  rated_user_id uuid NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, rater_id, rated_user_id),
  CHECK (rater_id <> rated_user_id)
);
GRANT SELECT ON public.ratings TO anon;
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings viewable by all" ON public.ratings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Participants can rate" ON public.ratings FOR INSERT TO authenticated
  WITH CHECK (
    rater_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.listing_participants lp JOIN public.listings l ON l.id = lp.listing_id
              WHERE lp.listing_id = ratings.listing_id AND lp.user_id = auth.uid() AND l.owner_id = ratings.rated_user_id)
      OR
      EXISTS (SELECT 1 FROM public.listings l JOIN public.listing_participants lp ON lp.listing_id = l.id
              WHERE l.id = ratings.listing_id AND l.owner_id = auth.uid() AND lp.user_id = ratings.rated_user_id)
    )
  );

CREATE OR REPLACE FUNCTION public.recompute_user_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  target := COALESCE(NEW.rated_user_id, OLD.rated_user_id);
  UPDATE public.profiles p SET
    rating_avg = COALESCE((SELECT ROUND(AVG(stars)::numeric, 2) FROM public.ratings WHERE rated_user_id = target), 0),
    rating_count = (SELECT COUNT(*) FROM public.ratings WHERE rated_user_id = target)
  WHERE p.id = target;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_recompute_rating AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.recompute_user_rating();
