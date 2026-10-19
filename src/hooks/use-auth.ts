import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = supabase.auth;
    const { data: sub } = auth.onAuthStateChange((_: string, s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  return { session, user, loading };
}
