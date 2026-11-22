import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthState = { user: User | null; username: string | null; ready: boolean };
const AuthContext = createContext<AuthState>({ user: null, username: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let alive = true;
    const guard = window.setTimeout(() => { if (alive) setReady(true); }, 5000);
    supabase.auth.getSession().then(({ data }) => { if (alive) setUser(data.session?.user ?? null); })
      .catch(() => undefined)
      .finally(() => { window.clearTimeout(guard); if (alive) setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) setUser(session?.user ?? null); });
    return () => { alive = false; window.clearTimeout(guard); listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !supabase) { setUsername(null); return; }
    const fromMeta: unknown = user.user_metadata?.username;
    if (typeof fromMeta === "string" && fromMeta) { setUsername(fromMeta); return; }
    let alive = true;
    Promise.resolve(supabase.from("profiles").select("username").eq("id", user.id).maybeSingle())
      .then(({ data }) => { if (alive) setUsername((data as { username: string } | null)?.username ?? null); })
      .catch(() => { if (alive) setUsername(null); });
    return () => { alive = false; };
  }, [user]);

  return <AuthContext.Provider value={{ user, username, ready }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState { return useContext(AuthContext); }
