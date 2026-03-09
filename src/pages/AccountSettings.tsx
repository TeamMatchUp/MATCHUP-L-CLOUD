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
import { Camera, Loader2, Save, User, Sun, Moon } from "lucide-react";

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
    </div>
  );
}
