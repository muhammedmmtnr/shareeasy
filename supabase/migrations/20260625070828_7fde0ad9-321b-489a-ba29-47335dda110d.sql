
-- ============ COMMUNITIES ============
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('apartment','college','office','neighborhood','other')),
  city text,
  description text,
  join_code text UNIQUE NOT NULL DEFAULT lower(substr(md5(random()::text), 1, 8)),
  created_by uuid NOT NULL,
  member_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.communities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Communities are browsable" ON public.communities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authed users create communities" ON public.communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators update communities" ON public.communities FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creators delete communities" ON public.communities FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============ MEMBERS ============
CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cm_user ON public.community_members(user_id);
CREATE INDEX idx_cm_community ON public.community_members(community_id);

-- Security definer helper to avoid recursive RLS lookups
CREATE OR REPLACE FUNCTION public.is_community_member(_community_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_members WHERE community_id = _community_id AND user_id = _user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) TO authenticated;

CREATE POLICY "Members see fellow members" ON public.community_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Users join communities" ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users leave communities" ON public.community_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Auto-add creator as admin member + maintain counts
CREATE OR REPLACE FUNCTION public.handle_new_community()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_community() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_handle_new_community AFTER INSERT ON public.communities
FOR EACH ROW EXECUTE FUNCTION public.handle_new_community();

CREATE OR REPLACE FUNCTION public.sync_community_member_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  cid := COALESCE(NEW.community_id, OLD.community_id);
  UPDATE public.communities SET member_count = (SELECT COUNT(*) FROM public.community_members WHERE community_id = cid) WHERE id = cid;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_community_member_count() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_member_count AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.sync_community_member_count();

-- ============ GROUP CHAT MESSAGES ============
CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.community_messages TO authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cmsg_community ON public.community_messages(community_id, created_at);
CREATE POLICY "Members read group chat" ON public.community_messages FOR SELECT TO authenticated
  USING (public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Members send group chat" ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Authors delete own messages" ON public.community_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- ============ COMMUNITY POSTS (discussion / bulk_buy / ride / poll) ============
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('discussion','bulk_buy','ride','poll')),
  title text NOT NULL,
  body text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cposts_community ON public.community_posts(community_id, created_at DESC);
CREATE POLICY "Members read posts" ON public.community_posts FOR SELECT TO authenticated
  USING (public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Members create posts" ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Authors update own posts" ON public.community_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid());
CREATE POLICY "Authors delete own posts" ON public.community_posts FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- ============ POLL VOTES ============
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pv_post ON public.poll_votes(post_id);

CREATE OR REPLACE FUNCTION public.can_access_poll(_post_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_posts p
    WHERE p.id = _post_id AND public.is_community_member(p.community_id, _user_id)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_poll(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_poll(uuid, uuid) TO authenticated;

CREATE POLICY "Members read votes" ON public.poll_votes FOR SELECT TO authenticated
  USING (public.can_access_poll(post_id, auth.uid()));
CREATE POLICY "Members vote" ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_poll(post_id, auth.uid()));
CREATE POLICY "Users update own vote" ON public.poll_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users remove own vote" ON public.poll_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());
