import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, effectiveRoles, loading } = useAuth();
  const location = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["onboarding-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if not completed (skip if already on onboarding)
  if (profile && !profile.onboarding_completed && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (requiredRole && !effectiveRoles.includes(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
