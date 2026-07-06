import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, Save, User, Sun, Moon, Sparkles, ExternalLink, Check } from "lucide-react";
import { getStripeEnvironment } from "@/lib/stripe";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { CoachFighterProfileForm } from "@/components/onboarding/CoachFighterProfileForm";

export default function AccountSettings() {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification preferences
  const [notifMatchProposals, setNotifMatchProposals] = useState(true);
  const [notifMatchUpdates, setNotifMatchUpdates] = useState(true);
  const [notifEventUpdates, setNotifEventUpdates] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);

  // Marketing
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Coach fighter profile state
  const [isCoach, setIsCoach] = useState(false);
  const [hasFighterProfile, setHasFighterProfile] = useState(false);
  const [fighterModalOpen, setFighterModalOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<"pro_monthly" | "pro_yearly" | null>(null);

  // Subscription
  const [subscription, setSubscription] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription(data);
    })();
  }, [user]);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/account`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Could not open billing portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Unable to open billing", description: e.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, notification_match_proposals, notification_match_updates, notification_event_updates, notification_system, marketing_opt_in")
      .eq("id", user.id)
      .single();

    if (data) {
      setFullName(data.full_name || "");
      setAvatarUrl(data.avatar_url);
      setNotifMatchProposals(data.notification_match_proposals ?? true);
      setNotifMatchUpdates(data.notification_match_updates ?? true);
      setNotifEventUpdates(data.notification_event_updates ?? true);
      setNotifSystem(data.notification_system ?? true);
      setMarketingOptIn(data.marketing_opt_in ?? false);
    }

    // Check coach/gym_owner role + existing fighter profile
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (roleRows ?? []).map((r) => r.role);
    const coachLike = roles.includes("coach") || roles.includes("gym_owner");
    setIsCoach(coachLike);

    if (coachLike) {
      const { data: fp } = await supabase
        .from("fighter_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setHasFighterProfile(!!fp);
    }

    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate password if user wants to change it
    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ title: "Passwords don't match", description: "Please make sure your passwords match.", variant: "destructive" });
        return;
      }
    }

    setSaving(true);

    // Check we have a valid session before auth operations
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast({ title: "Session expired", description: "Please sign in again to update your settings.", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Update profile in database
    const avatarClean = avatarUrl?.split("?")[0] || null;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        avatar_url: avatarClean,
        notification_match_proposals: notifMatchProposals,
        notification_match_updates: notifMatchUpdates,
        notification_event_updates: notifEventUpdates,
        notification_system: notifSystem,
        marketing_opt_in: marketingOptIn,
      })
      .eq("id", user.id);

    if (profileError) {
      toast({ title: "Failed to update profile", description: profileError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Update password if provided
    if (newPassword) {
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) {
        toast({ title: "Failed to update password", description: pwError.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    // Update auth metadata name
    const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    if (metaError) {
      console.warn("Could not update auth metadata:", metaError.message);
    }

    setSaving(false);
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Settings saved", description: "Your account settings have been updated." });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-2xl mx-auto px-4">
          <h1 className="font-heading text-3xl text-foreground mb-8">Account Settings</h1>

          {/* Profile Photo */}
          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">Profile Photo</h2>
            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-20 w-20 border-2 border-border">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Profile" />
                  ) : null}
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click to upload a new photo</p>
                <p className="text-xs text-muted-foreground">Max 2MB, JPG/PNG/WebP</p>
              </div>
            </div>
          </section>

          <Separator className="mb-8" />

          {/* Name & Email */}
          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">Personal Details</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="opacity-60"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>
            </div>
          </section>

          {isCoach && !hasFighterProfile && (
            <>
              <Separator className="mb-8" />
              <section className="space-y-4 mb-8">
                <h2 className="text-lg font-semibold text-foreground">Fighter Profile</h2>
                <p className="text-sm text-muted-foreground">
                  Add a fighter profile so you can be put forward for events as an active fighter.
                </p>
                <Button variant="hero" onClick={() => setFighterModalOpen(true)}>
                  Add fighter profile
                </Button>
              </section>
            </>
          )}

          <Separator className="mb-8" />

          {/* Subscription / Billing */}
          <section className="space-y-4 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Subscription</h2>
              </div>
              {/* Monthly / Annual toggle */}
              <div
                role="tablist"
                aria-label="Billing interval"
                style={{
                  display: "inline-flex",
                  padding: 4,
                  borderRadius: 999,
                  background: "#181c24",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
                }}
              >
                {(["monthly", "annual"] as const).map((k) => {
                  const active = billingInterval === k;
                  return (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setBillingInterval(k)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        background: active ? "#e8a020" : "transparent",
                        color: active ? "#080a0d" : "#8b909e",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {k === "monthly" ? "Monthly" : "Annual"}
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const isPro = subscription && ["active", "trialing", "past_due"].includes(subscription.status);
              const price = billingInterval === "monthly" ? "£9.99" : "£99";
              const sub = billingInterval === "monthly" ? "per month" : "per year — save 2 months";
              const planId = billingInterval === "monthly" ? "pro_monthly" : "pro_yearly";
              const freeFeatures = [
                "Create and complete your profile",
                "Browse events, gyms and fighters",
                "Basic match proposals",
                "Standard notifications",
              ];
              const proFeatures = [
                "Priority matchmaking suggestions",
                "Advanced fight analytics & win probability",
                "Featured placement in fighter search",
                "Unlimited match proposals",
                "Verified profile badge",
              ];
              const cardStyle: React.CSSProperties = {
                background: "#111318",
                borderRadius: 12,
                padding: 24,
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                display: "flex",
                flexDirection: "column",
              };
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                  {/* Free tier */}
                  <div style={cardStyle}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: "0.06em", color: "#8b909e" }}>
                      FREE
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "#e8eaf0" }}>£0</span>
                      <span style={{ fontSize: 12, color: "#8b909e", marginLeft: 6 }}>forever</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#8b909e", marginTop: 10, marginBottom: 16 }}>
                      Everything you need to get started on MatchUp.
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", flex: 1 }}>
                      {freeFeatures.map((f) => (
                        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#e8eaf0", marginBottom: 8 }}>
                          <Check style={{ width: 14, height: 14, color: "#8b909e", flexShrink: 0, marginTop: 3 }} /> {f}
                        </li>
                      ))}
                    </ul>
                    <div
                      style={{
                        padding: "10px 0",
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        borderRadius: 8,
                        background: "#181c24",
                        color: "#8b909e",
                      }}
                    >
                      {isPro ? "Included" : "Current plan"}
                    </div>
                  </div>

                  {/* Pro tier */}
                  <div style={{ ...cardStyle, boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(232,160,32,0.25), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: "0.06em", color: "#e8a020" }}>
                        PRO
                      </div>
                      {isPro && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#e8a020", background: "rgba(232,160,32,0.12)", padding: "3px 8px", borderRadius: 999 }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "#e8eaf0" }}>{price}</span>
                      <span style={{ fontSize: 12, color: "#8b909e", marginLeft: 6 }}>{sub}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#8b909e", marginTop: 10, marginBottom: 16 }}>
                      For serious fighters and coaches who want the edge.
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", flex: 1 }}>
                      {proFeatures.map((f) => (
                        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#e8eaf0", marginBottom: 8 }}>
                          <Check style={{ width: 14, height: 14, color: "#e8a020", flexShrink: 0, marginTop: 3 }} /> {f}
                        </li>
                      ))}
                    </ul>
                    {isPro ? (
                      <button
                        onClick={openBillingPortal}
                        disabled={portalLoading}
                        style={{
                          padding: "10px 0",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          borderRadius: 8,
                          border: "none",
                          cursor: portalLoading ? "wait" : "pointer",
                          background: "#181c24",
                          color: "#e8eaf0",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        Manage billing
                      </button>
                    ) : (
                      <button
                        onClick={() => setCheckoutPlan(planId)}
                        style={{
                          padding: "10px 0",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          borderRadius: 8,
                          border: "none",
                          cursor: "pointer",
                          background: "#e8a020",
                          color: "#080a0d",
                        }}
                      >
                        Upgrade to Pro
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </section>

          <Separator className="mb-8" />


          {/* Password */}
          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave blank if you don't want to change your password.</p>
            </div>
          </section>

          <Separator className="mb-8" />

          {/* Notification Preferences */}
          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Match Proposals</p>
                  <p className="text-xs text-muted-foreground">Notified when a new match is proposed</p>
                </div>
                <Switch checked={notifMatchProposals} onCheckedChange={setNotifMatchProposals} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Match Updates</p>
                  <p className="text-xs text-muted-foreground">Status changes on matches you're involved in</p>
                </div>
                <Switch checked={notifMatchUpdates} onCheckedChange={setNotifMatchUpdates} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Event Updates</p>
                  <p className="text-xs text-muted-foreground">Changes to events you're linked to</p>
                </div>
                <Switch checked={notifEventUpdates} onCheckedChange={setNotifEventUpdates} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">System Notifications</p>
                  <p className="text-xs text-muted-foreground">General platform updates and alerts</p>
                </div>
                <Switch checked={notifSystem} onCheckedChange={setNotifSystem} />
              </div>
            </div>
          </section>

          <Separator className="mb-8" />

          {/* Marketing */}
          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">Marketing & Communications</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Marketing Emails</p>
                <p className="text-xs text-muted-foreground">Receive promotions, event highlights, and news</p>
              </div>
              <Switch checked={marketingOptIn} onCheckedChange={setMarketingOptIn} />
            </div>
          </section>

          <Separator className="mb-8" />

          {/* Appearance */}
          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </section>

          <Separator className="mb-8" />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button variant="hero" onClick={handleSave} disabled={saving} className="min-w-[140px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />

      <Dialog open={fighterModalOpen} onOpenChange={setFighterModalOpen}>
        <DialogContent className="max-w-[min(90vw,960px)] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add fighter profile</DialogTitle>
          </DialogHeader>
          {user && (
            <CoachFighterProfileForm
              userId={user.id}
              displayName={fullName || user.email || "Coach"}
              onSaved={() => {
                setFighterModalOpen(false);
                setHasFighterProfile(true);
              }}
              onCancel={() => setFighterModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutPlan} onOpenChange={(o) => !o && setCheckoutPlan(null)}>
        <DialogContent style={{ maxWidth: "min(90vw, 960px)", maxHeight: "88vh", overflowY: "auto", background: "#111318" }}>
          <DialogTitle style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#e8eaf0", letterSpacing: "0.04em" }}>
            SUBSCRIBE TO MATCHUP PRO
          </DialogTitle>
          {checkoutPlan && user && (
            <StripeEmbeddedCheckout
              mode="subscription"
              priceId={checkoutPlan}
              userId={user.id}
              customerEmail={user.email ?? undefined}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
