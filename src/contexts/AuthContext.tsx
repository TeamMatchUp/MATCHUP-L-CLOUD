import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
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
    // Set up auth listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase
          setTimeout(() => fetchRoles(session.user.id), 0);
        } else {
          setRoles([]);
          setActiveRole(null);
        }
        setLoading(false);
      }
    );

    // Then check initial session
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
    await supabase.auth.signOut();
    localStorage.removeItem("matchup_active_role");
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
