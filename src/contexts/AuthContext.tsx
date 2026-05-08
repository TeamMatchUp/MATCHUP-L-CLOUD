import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Compute effective roles based on tier inheritance:
 * admin → inherits all
 * gym_owner → inherits organiser, fighter, coach
 */
function getEffectiveRoles(rawRoles: AppRole[]): AppRole[] {
  const effective = new Set<string>(rawRoles);
  for (const role of rawRoles) {
    if (role === "admin") {
      effective.add("gym_owner");
      effective.add("organiser");
      effective.add("fighter");
      effective.add("coach");
    }
    if (role === "gym_owner") {
      effective.add("organiser");
      effective.add("fighter");
      effective.add("coach");
    }
  }
  return Array.from(effective) as AppRole[];
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  effectiveRoles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  roles: [],
  effectiveRoles: [],
  activeRole: null,
  setActiveRole: () => {},
  loading: true,
  signOut: async () => {},
  refreshRoles: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveRoles = useMemo(() => getEffectiveRoles(roles), [roles]);

  const fetchRoles = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const userRoles = (data ?? []).map((r) => r.role);
    setRoles(userRoles);

    // Restore active role from localStorage or pick first
    const stored = localStorage.getItem("matchup_active_role") as AppRole | null;
    if (stored && userRoles.includes(stored)) {
      setActiveRole(stored);
    } else if (userRoles.length > 0) {
      setActiveRole(userRoles[0]);
      localStorage.setItem("matchup_active_role", userRoles[0]);
    } else {
      setActiveRole(null);
    }
  }, []);

  const handleSetActiveRole = useCallback((role: AppRole) => {
    setActiveRole(role);
    localStorage.setItem("matchup_active_role", role);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRoles(session.user.id), 0);
          if (event === "SIGNED_IN") {
            try {
              const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
              const role = roles?.[0]?.role || "unknown";
              await (supabase.from("analytics_events") as any).insert({
                user_id: session.user.id,
                event_type: "session_started",
                event_data: { role },
                page: window.location.pathname,
              });
            } catch {}
          }
        } else {
          setRoles([]);
          setActiveRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchRoles]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      console.error("signOut error", e);
    }
    try {
      localStorage.removeItem("matchup_active_role");
      // Clear any lingering supabase auth tokens
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    setSession(null);
    setUser(null);
    setRoles([]);
    setActiveRole(null);
  };

  const refreshRoles = async () => {
    if (user) await fetchRoles(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        roles,
        effectiveRoles,
        activeRole,
        setActiveRole: handleSetActiveRole,
        loading,
        signOut,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
