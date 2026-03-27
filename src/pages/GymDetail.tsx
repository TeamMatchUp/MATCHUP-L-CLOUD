import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, ShieldCheck, Plus, Trash2, Pencil, LogOut, Lock, Mail, Phone, Globe, Copy, Check as CheckIcon } from "lucide-react";
import { ClaimGymDialog } from "@/components/gym/ClaimGymDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { JoinGymButton } from "@/components/gym/JoinGymButton";
import { GymContactCTA } from "@/components/gym/GymContactCTA";
import { AddFighterToGymDialog } from "@/components/gym/AddFighterToGymDialog";
import { useToast } from "@/hooks/use-toast";
import { EditGymDialog } from "@/components/gym/EditGymDialog";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

import { STYLE_LABELS } from "@/lib/format";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  approved: { label: "Active", className: "bg-success/20 text-success border-success/30" },
  pending: { label: "Pending", className: "bg-warning/20 text-warning border-warning/30" },
  declined: { label: "Declined", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

export default function GymDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, effectiveRoles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddFighter, setShowAddFighter] = useState(false);
  const [showEditGym, setShowEditGym] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isFighter = effectiveRoles.includes("fighter") && !effectiveRoles.includes("coach");
  const isCoach = effectiveRoles.includes("coach") || effectiveRoles.includes("gym_owner");
  const isOrganiserOnly = effectiveRoles.includes("organiser") && !isCoach && !isFighter;

  useEffect(() => {
    if (searchParams.get("action") === "claim" && user) {
      setShowClaimDialog(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [user, searchParams, setSearchParams]);

  const handleClaimClick = () => {
    if (!user) {
      navigate(`/auth?mode=signup&returnTo=${encodeURIComponent(`/gyms/${id}?action=claim`)}`);
      return;
    }
    setShowClaimDialog(true);
  };

  const handleCopyCoachUrl = () => {
    const url = `${window.location.origin}/auth?mode=signup`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: gym, isLoading } = useQuery({
    queryKey: ["gym", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("*, fighter_gym_links(id, fighter_id, is_primary, status, fighter_profiles(id, name, weight_class, style, record_wins, record_losses, record_draws, available))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: myFighterProfile } = useQuery({
    queryKey: ["my-fighter-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Check if current user has ANY link (approved or pending)
  const { data: myGymLink } = useQuery({
    queryKey: ["my-gym-link", myFighterProfile?.id, id],
    queryFn: async () => {
      if (!myFighterProfile?.id || !id) return null;
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, status")
        .eq("fighter_id", myFighterProfile.id)
        .eq("gym_id", id)
        .in("status", ["approved", "pending"])
        .maybeSingle();
      return data;
    },
    enabled: !!myFighterProfile?.id && !!id,
  });

  const isOwner = !!user && !!gym && gym.coach_id === user.id;
  const isMember = !!myGymLink && myGymLink.status === "approved";

  // (4) Increment unclaimed_interactions for non-owner users on unclaimed gyms
  useEffect(() => {
    if (!gym || isOwner || gym.claimed) return;
    supabase.rpc('has_role' as any, { _user_id: 'placeholder', _role: 'admin' }).then(() => {});
    // Increment via direct update
    supabase.from("gyms").update({ unclaimed_interactions: (gym.unclaimed_interactions ?? 0) + 1 } as any).eq("id", gym.id).then(() => {});
  }, [gym?.id, isOwner, gym?.claimed]);

  // Track profile view (non-owner)
  useEffect(() => {
    if (!gym || isOwner) return;
    supabase.from("gym_profile_views" as any).insert({
      gym_id: gym.id,
      viewer_user_id: user?.id ?? null,
    } as any).then(() => {});
  }, [gym?.id, isOwner, user?.id]);

  const removeFighterMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("fighter_gym_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym", id] });
      toast({ title: "Fighter removed from gym" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to remove fighter", description: e.message, variant: "destructive" });
    },
  });

  const leaveGymMutation = useMutation({
    mutationFn: async () => {
      if (!myGymLink?.id || !gym?.coach_id || !myFighterProfile) return;
      const { error: deleteError } = await supabase
        .from("fighter_gym_links")
        .delete()
        .eq("id", myGymLink.id);
      if (deleteError) throw deleteError;

      const { error: notifError } = await supabase.rpc("create_notification", {
        _user_id: gym.coach_id,
        _title: `${myFighterProfile.name} left ${gym.name}`,
        _message: `${myFighterProfile.name} has left your gym.`,
        _type: "system",
        _reference_id: gym.id,
      });
      if (notifError) console.error("Failed to send notification:", notifError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym", id] });
      queryClient.invalidateQueries({ queryKey: ["my-gym-link"] });
      queryClient.invalidateQueries({ queryKey: ["fighter-gym-memberships"] });
      toast({ title: "Left gym successfully" });
      navigate("/fighter/dashboard");
    },
    onError: (e: any) => {
      toast({ title: "Failed to leave gym", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16">
            <div className="h-8 w-64 bg-card animate-pulse rounded mb-4" />
          </div>
        </main>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16 text-center">
            <h1 className="font-heading text-3xl text-foreground mb-4">Gym Not Found</h1>
            <Button variant="ghost" asChild>
              <Link to="/explore?tab=gyms"><ArrowLeft className="h-4 w-4 mr-2" />Back to Gyms</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const links = gym.fighter_gym_links ?? [];

  // Determine what action button to show
  const renderActionButton = () => {
    if (isOwner) {
      return (
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowEditGym(true)}>
          <Pencil className="h-3 w-3" /> Edit Gym
        </Button>
      );
    }
    if (isMember) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-destructive hover:text-destructive"
          onClick={() => setShowLeaveConfirm(true)}
        >
          <LogOut className="h-3 w-3" /> Leave Gym
        </Button>
      );
    }
    // Don't show Join button for unclaimed gyms
    if (!gym.claimed) return null;
    return <JoinGymButton gymId={gym.id} />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container max-w-3xl">
            <div className="pt-6 md:pt-8 lg:pt-10">
              <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-start justify-between gap-6 mb-8">
                <div className="flex items-start gap-6">
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center font-heading text-xl text-muted-foreground shrink-0">
                    {gym.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-heading text-3xl md:text-4xl text-foreground">{gym.name}</h1>
                      {gym.verified && <ShieldCheck className="h-5 w-5 text-primary" />}
                      {gym.claimed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 text-xs font-semibold">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-xs font-semibold">
                          Unclaimed
                        </span>
                      )}
                    </div>
                    {gym.location && (
                      <p className="text-muted-foreground flex items-center gap-2 mt-2">
                        <MapPin className="h-4 w-4" />{gym.location}
                      </p>
                    )}
                  </div>
                </div>
                {renderActionButton()}
              </div>

              {gym.description && (
                <div className="mb-8">
                  <p className="text-muted-foreground leading-relaxed">{gym.description}</p>
                </div>
              )}

              {/* Discipline tags removed from header — shown in description card below */}

              {/* Contact CTA — role/status aware */}
              {!isOwner && (
                <div className="mb-8">
                  {isMember ? (
                    <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-center gap-3">
                      <CheckIcon className="h-5 w-5 text-success shrink-0" />
                      <p className="text-sm text-foreground font-medium">You are a member of this gym</p>
                    </div>
                  ) : gym.claimed ? (
                    <GymContactCTA gymId={gym.id} gymName={gym.name} coachId={gym.coach_id} />
                  ) : null}
                </div>
              )}

              {/* Unclaimed gym: styled invite card — hidden for organisers */}
              {!isOwner && !gym.claimed && !isOrganiserOnly && (
                <div className="mb-8 rounded-lg border-2 border-primary/40 bg-card p-6 space-y-4">
                  <h3 className="font-heading text-lg text-foreground">This gym hasn't been claimed yet</h3>
                  {isCoach ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Are you the coach here? Claim this listing to manage your gym's profile, roster, and analytics.
                      </p>
                      <Button variant="hero" size="sm" onClick={handleClaimClick}>
                        Coach? Claim this gym
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Know the coach? Share this invite link so they can claim their listing.
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-xs text-muted-foreground truncate">
                          {`${window.location.origin}/gyms/${gym.id}?action=claim`}
                        </div>
                        <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/gyms/${gym.id}?action=claim`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}>
                          {copied ? <CheckIcon className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1 text-primary border-primary/30" onClick={handleClaimClick}>
                        Coach? Claim this gym
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Contact details — visible to all */}
              {(gym.contact_email || gym.phone || gym.website) && (
                <div className="mb-8 rounded-lg border border-border bg-card p-5">
                  <h2 className="font-heading text-lg text-foreground mb-3">Contact details</h2>
                  <div className="space-y-2">
                    {gym.contact_email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" /> {gym.contact_email}
                      </p>
                    )}
                    {gym.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" /> {gym.phone}
                      </p>
                    )}
                    {gym.website && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <a href={gym.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                          {gym.website}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Social Media Links */}
              {(gym.instagram_url || gym.facebook_url || gym.twitter_url) && (
                <div className="flex gap-3 mb-8">
                  {gym.instagram_url && (
                    <a href={gym.instagram_url} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center hover:border-primary/30 transition-colors">
                      <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                  )}
                  {gym.facebook_url && (
                    <a href={gym.facebook_url} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center hover:border-primary/30 transition-colors">
                      <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                  )}
                  {gym.twitter_url && (
                    <a href={gym.twitter_url} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center hover:border-primary/30 transition-colors">
                      <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  )}
                </div>
              )}

              {/* Training Schedule */}
              {gym.training_schedule && (
                <div className="mb-8 rounded-lg border border-border bg-card p-5">
                  <h2 className="font-heading text-lg text-foreground mb-3">Training & Classes</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{gym.training_schedule}</p>
                </div>
              )}

              {/* Location Map */}
              {gym.location && (
                <div className="rounded-lg border border-border overflow-hidden mb-8">
                  <iframe
                    title="Gym Location"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(
                      [gym.name, gym.address, gym.location, gym.city, gym.country].filter(Boolean).join(", ")
                    )}&output=embed&z=14`}
                  />
                  <div className="bg-card px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    {[gym.address, gym.location, gym.city].filter(Boolean).join(", ")}
                  </div>
                </div>
              )}

              {/* Fighter Roster */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl text-foreground">
                  FIGHTER <span className="text-primary">ROSTER</span>
                </h2>
                {isOwner && (
                  <Button size="sm" className="gap-1" onClick={() => setShowAddFighter(true)}>
                    <Plus className="h-3 w-3" /> Add Fighter
                  </Button>
                )}
              </div>

              {(() => {
                const approvedLinks = links.filter((l: any) => l.status === "approved" && l.fighter_profiles);
                // Sort by win count descending for ranking
                const sorted = [...approvedLinks].sort((a: any, b: any) =>
                  (b.fighter_profiles?.record_wins ?? 0) - (a.fighter_profiles?.record_wins ?? 0)
                );
                if (sorted.length === 0) {
                  return (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                      <p className="text-muted-foreground mb-4">No fighters registered at this gym yet.</p>
                      {isOwner && (
                        <Button onClick={() => setShowAddFighter(true)} className="gap-1">
                          <Plus className="h-4 w-4" /> Add Your First Fighter
                        </Button>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sorted.map((link: any, idx: number) => {
                      const fighter = link.fighter_profiles;
                      const record = `${fighter.record_wins}-${fighter.record_losses}-${fighter.record_draws}`;
                      const initials = fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2);
                      return (
                        <Link
                          key={link.id}
                          to={`/fighters/${fighter.id}`}
                          className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all flex items-center gap-4"
                        >
                          <span className="font-heading text-lg text-muted-foreground w-6 text-center shrink-0">#{idx + 1}</span>
                          <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center font-heading text-sm text-muted-foreground shrink-0 overflow-hidden">
                            {fighter.profile_image ? (
                              <img src={fighter.profile_image} alt={fighter.name} className="h-full w-full object-cover" />
                            ) : initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{fighter.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {WEIGHT_CLASS_LABELS[fighter.weight_class]}
                              {fighter.style ? ` · ${STYLE_LABELS[fighter.style]}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-primary font-bold text-sm">{record}</p>
                          </div>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFighterMutation.mutate(link.id); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                );
              })()}
            </motion.div>

            {isOwner && (
              <AddFighterToGymDialog
                open={showAddFighter}
                onOpenChange={setShowAddFighter}
                gymId={gym.id}
                coachId={user!.id}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["gym", id] })}
              />
            )}

            {isOwner && gym && (
              <EditGymDialog
                open={showEditGym}
                onOpenChange={setShowEditGym}
                gym={gym}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["gym", id] })}
                onDelete={() => navigate("/gym-owner/dashboard")}
              />
            )}

            <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave {gym?.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave this gym? Your affiliation will be removed and the gym owner will be notified.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => leaveGymMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {leaveGymMutation.isPending ? "Leaving..." : "Leave Gym"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Only show claim dialog for coaches — never for fighters or organisers */}
            {isCoach && (
              <ClaimGymDialog
                open={showClaimDialog}
                onOpenChange={setShowClaimDialog}
                gymId={gym.id}
                gymName={gym.name}
              />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
