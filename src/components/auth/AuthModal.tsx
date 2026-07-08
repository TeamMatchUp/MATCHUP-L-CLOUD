import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AppLogo } from "@/components/AppLogo";
import { ArrowLeft, Check } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
export type AuthModalMode = "signin" | "signup" | "forgot";

const ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "organiser", label: "Event Organiser", description: "Create events and matchmake fighters" },
  { value: "fighter", label: "Fighter", description: "Manage your profile and accept fight offers" },
  { value: "gym_owner", label: "Coach", description: "Manage gyms, rosters, fighter records, and organise events" },
];

const ROLE_DASHBOARDS: Record<AppRole, string> = {
  organiser: "/organiser/dashboard",
  fighter: "/fighter/dashboard",
  gym_owner: "/gym-owner/dashboard",
  coach: "/coach/dashboard",
  admin: "/admin/dashboard",
};

const SIGNUP_STEPS = ["Role", "Account", "Confirm"] as const;

type Props = {
  open: boolean;
  mode: AuthModalMode;
  onModeChange: (m: AuthModalMode) => void;
  onClose: () => void;
};

export function AuthModal({ open, mode, onModeChange, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [signupStep, setSignupStep] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset on close
      setSignupStep(0);
      setLoading(false);
    }
  }, [open]);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const getRedirect = (userRoles: AppRole[]) => {
    if (from && from !== "/") return from;
    const primary = userRoles[0];
    return primary ? ROLE_DASHBOARDS[primary] : "/";
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();
    setLoading(false);
    const userRoles = (rolesData ?? []).map((r) => r.role as AppRole);
    onClose();
    if (!profile?.onboarding_completed) {
      navigate("/onboarding", { replace: true });
      return;
    }
    navigate(getRedirect(userRoles), { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      toast({ title: "Select a role", description: "Please select a role.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    if (error) {
      setLoading(false);
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }

    if (data.user) {
      const { error: roleError } = await supabase.rpc("assign_signup_role", { _role: selectedRole });
      if (roleError) {
        console.error("Failed to assign role:", roleError);
        setLoading(false);
        toast({ title: "Sign up incomplete", description: roleError.message, variant: "destructive" });
        return;
      }

      if (data.session) {
        setLoading(false);
        onClose();
        window.location.href = "/onboarding";
        return;
      }
    }
    setLoading(false);
    toast({ title: "Account created", description: "Check your email to confirm your account." });
    onClose();
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Enter your email", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We've sent you a password reset link." });
      onModeChange("signin");
    }
  };

  const nextStep = () => {
    if (signupStep === 0 && !selectedRole) {
      toast({ title: "Select a role", variant: "destructive" });
      return;
    }
    if (signupStep === 1) {
      if (!fullName || !email || !password) {
        toast({ title: "Complete all fields", variant: "destructive" });
        return;
      }
      if (password.length < 6) {
        toast({ title: "Password too short", description: "At least 6 characters.", variant: "destructive" });
        return;
      }
    }
    setSignupStep((s) => Math.min(s + 1, SIGNUP_STEPS.length - 1));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 border-0 max-w-md overflow-hidden"
        style={{
          background: "hsl(var(--card))",
          boxShadow: "var(--shadow-modal)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-center mb-5">
            <AppLogo className="h-8" />
          </div>

          {mode === "forgot" && (
            <>
              <button
                onClick={() => onModeChange("signin")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
              <h2 className="font-heading text-2xl text-foreground mb-1">Reset password</h2>
              <p className="text-sm text-muted-foreground mb-5">We'll email you a reset link.</p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-email">Email</Label>
                  <Input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </>
          )}

          {mode === "signin" && (
            <>
              <h2 className="font-heading text-2xl text-foreground mb-1">Sign in</h2>
              <p className="text-sm text-muted-foreground mb-5">Welcome back.</p>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-password">Password</Label>
                  <Input
                    id="si-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                  {loading ? "Please wait..." : "Sign in"}
                </Button>
              </form>
              <button
                onClick={() => onModeChange("forgot")}
                className="block text-sm text-muted-foreground hover:text-primary mt-3"
              >
                Forgot password?
              </button>
              <div className="mt-6 pt-5 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button onClick={() => onModeChange("signup")} className="text-primary hover:underline font-medium">
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === "signup" && (
            <>
              <h2 className="font-heading text-2xl text-foreground mb-4">Create account</h2>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  {SIGNUP_STEPS.map((label, i) => {
                    const done = i < signupStep;
                    const active = i === signupStep;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => i <= signupStep && setSignupStep(i)}
                        className="flex items-center gap-2"
                        style={{ cursor: i <= signupStep ? "pointer" : "default" }}
                      >
                        <span
                          className="flex items-center justify-center rounded-full text-xs font-semibold"
                          style={{
                            width: 24,
                            height: 24,
                            background: done || active ? "hsl(var(--primary))" : "rgba(255,255,255,0.06)",
                            color: done || active ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          {done ? <Check className="h-3 w-3" /> : i + 1}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${((signupStep + 1) / SIGNUP_STEPS.length) * 100}%`,
                      background: "hsl(var(--primary))",
                    }}
                  />
                </div>
              </div>

              {signupStep === 0 && (
                <div className="space-y-3">
                  <Label>I am a...</Label>
                  {ROLES.map((role) => {
                    const isSel = selectedRole === role.value;
                    return (
                      <label
                        key={role.value}
                        className="flex items-start gap-3 rounded-md p-3 cursor-pointer transition-colors"
                        style={{
                          background: isSel ? "hsl(var(--primary) / 0.10)" : "hsl(var(--accent))",
                          outline: isSel ? "1px solid hsl(var(--primary))" : "1px solid transparent",
                        }}
                        onClick={() => setSelectedRole(role.value)}
                      >
                        <div
                          className="mt-1 h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            border: `2px solid ${isSel ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.5)"}`,
                          }}
                        >
                          {isSel && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{role.label}</span>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                      </label>
                    );
                  })}
                  <Button type="button" variant="hero" className="w-full mt-4" onClick={nextStep}>
                    Continue
                  </Button>
                </div>
              )}

              {signupStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input id="su-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-password">Password</Label>
                    <Input
                      id="su-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setSignupStep(0)}>
                      Back
                    </Button>
                    <Button type="button" variant="hero" className="flex-1" onClick={nextStep}>
                      Review
                    </Button>
                  </div>
                </div>
              )}

              {signupStep === 2 && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2" style={{ borderBottom: "1px solid hsl(var(--muted))" }}>
                      <span className="text-muted-foreground">Role</span>
                      <span className="text-foreground font-medium">
                        {ROLES.find((r) => r.value === selectedRole)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between py-2" style={{ borderBottom: "1px solid hsl(var(--muted))" }}>
                      <span className="text-muted-foreground">Name</span>
                      <span className="text-foreground font-medium">{fullName}</span>
                    </div>
                    <div className="flex justify-between py-2" style={{ borderBottom: "1px solid hsl(var(--muted))" }}>
                      <span className="text-muted-foreground">Email</span>
                      <span className="text-foreground font-medium">{email}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setSignupStep(1)}>
                      Back
                    </Button>
                    <Button type="submit" variant="hero" className="flex-1" disabled={loading}>
                      {loading ? "Creating..." : "Create account"}
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-6 pt-5 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => onModeChange("signin")} className="text-primary hover:underline font-medium">
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
