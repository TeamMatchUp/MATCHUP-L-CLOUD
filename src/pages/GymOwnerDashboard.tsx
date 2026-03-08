import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, ArrowRight, Building2, Users, Inbox, Pencil, FileText, Trash2 } from "lucide-react";
import { ProposalCard } from "@/components/coach/ProposalCard";
import { AddFighterToGymDialog } from "@/components/gym/AddFighterToGymDialog";
import { AddFightResultDialog } from "@/components/coach/AddFightResultDialog";
import { EditFighterDialog } from "@/components/coach/EditFighterDialog";
import { DeleteFighterDialog } from "@/components/coach/DeleteFighterDialog";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type CountryCode = Database["public"]["Enums"]["country_code"];
const COUNTRIES = Constants.public.Enums.country_code;

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/20 text-success border-success/30",
  completed: "bg-secondary/20 text-secondary border-secondary/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function GymOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAddFighter, setShowAddFighter] = useState(false);
  const [addFighterGymId, setAddFighterGymId] = useState<string | undefined>();
  const [showCreateGym, setShowCreateGym] = useState(false);
  const [newGymName, setNewGymName] = useState("");
  const [newGymLocation, setNewGymLocation] = useState("");
  const [newGymCountry, setNewGymCountry] = useState<CountryCode>("UK");
  const [newGymDescription, setNewGymDescription] = useState("");
  const [fightResultFighter, setFightResultFighter] = useState<{ id: string; name: string } | null>(null);
  const [editFighter, setEditFighter] = useState<any>(null);
  const [deleteFighter, setDeleteFighter] = useState<{ id: string; name: string } | null>(null);
  const [rosterGymFilter, setRosterGymFilter] = useState<string>("all");

  // Get owner's gyms
  const { data: myGyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ["owner-gyms", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("gyms")
        .select("id, name, location, city, address, country, description, contact_email, phone, website, fighter_gym_links(fighter_id)")
        .eq("coach_id", user!.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  // Redirect to gym registration if coach has no gyms
  useEffect(() => {
    if (!gymsLoading && myGyms.length === 0 && user) {
      navigate("/register-gym", { replace: true });
    }
  }, [gymsLoading, myGyms.length, user, navigate]);

  const primaryGym = myGyms[0];

  // Get fighters created by this owner
  const { data: myFighters = [] } = useQuery({
    queryKey: ["owner-fighters", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("*")
        .eq("created_by_coach_id", user!.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  // Get fighters linked via gyms (with gym mapping)
  const { data: gymFighterLinks = [] } = useQuery({
    queryKey: ["owner-gym-fighter-links", user?.id, myGyms.map(g => g.id).join(",")],
    queryFn: async () => {
      if (myGyms.length === 0) return [];
      const gymIds = myGyms.map((g) => g.id);
      const { data: links } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id, gym_id")
        .in("gym_id", gymIds);
      return links ?? [];
    },
    enabled: myGyms.length > 0,
  });

  const { data: gymFighters = [] } = useQuery({
    queryKey: ["owner-gym-fighters", user?.id, gymFighterLinks.map(l => l.fighter_id).join(",")],
    queryFn: async () => {
      if (gymFighterLinks.length === 0) return [];
      const fighterIds = [...new Set(gymFighterLinks.map((l) => l.fighter_id))];
      const { data: fighters } = await supabase
        .from("fighter_profiles")
        .select("*")
        .in("id", fighterIds);
      return fighters ?? [];
    },
    enabled: gymFighterLinks.length > 0,
  });

  // Combine unique fighters
  const allFighterMap = new Map<string, (typeof myFighters)[0]>();
  [...myFighters, ...gymFighters].forEach((f) => allFighterMap.set(f.id, f));
  const allFighters = Array.from(allFighterMap.values());
  const fighterIds = allFighters.map((f) => f.id);

  // Build gym-to-fighter mapping for filtering
  const gymToFighterIds = new Map<string, Set<string>>();
  gymFighterLinks.forEach((link) => {
    if (!gymToFighterIds.has(link.gym_id)) gymToFighterIds.set(link.gym_id, new Set());
    gymToFighterIds.get(link.gym_id)!.add(link.fighter_id);
  });

  // Filtered fighters for roster tab
  const filteredRosterFighters = rosterGymFilter === "all"
    ? allFighters
    : allFighters.filter((f) => gymToFighterIds.get(rosterGymFilter)?.has(f.id));

  // Get proposals involving owner's fighters
  const { data: proposals = [] } = useQuery({
    queryKey: ["owner-proposals", fighterIds],
    queryFn: async () => {
      if (fighterIds.length === 0) return [];
      const { data: pA } = await supabase
        .from("match_proposals")
        .select(
          "*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(*), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(*), fight_slot:fight_slots!match_proposals_fight_slot_id_fkey(*, events(*))"
        )
        .in("fighter_a_id", fighterIds)
        .in("status", ["pending", "confirmed"]);
      const { data: pB } = await supabase
        .from("match_proposals")
        .select(
          "*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(*), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(*), fight_slot:fight_slots!match_proposals_fight_slot_id_fkey(*, events(*))"
        )
        .in("fighter_b_id", fighterIds)
        .in("status", ["pending", "confirmed"]);
      const map = new Map<string, any>();
      [...(pA || []), ...(pB || [])].forEach((p) => map.set(p.id, p));
      return Array.from(map.values());
    },
    enabled: fighterIds.length > 0,
  });

  // Get owner's events (inherited organiser capability)
  const { data: events = [] } = useQuery({
    queryKey: ["owner-events", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, fight_slots(*)")
        .eq("organiser_id", user!.id)
        .order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const pendingProposals = proposals.filter((p: any) => p.status === "pending");
  const confirmedProposals = proposals.filter((p: any) => p.status === "confirmed");

  const createGymMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gyms").insert({
        name: newGymName,
        location: newGymLocation || null,
        country: newGymCountry,
        description: newGymDescription || null,
        coach_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-gyms"] });
      toast({ title: "Gym created" });
      setShowCreateGym(false);
      setNewGymName("");
      setNewGymLocation("");
      setNewGymDescription("");
    },
    onError: (e: any) => {
      toast({
        title: "Failed to create gym",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["owner-proposals"] });
    queryClient.invalidateQueries({ queryKey: ["owner-fighters"] });
    queryClient.invalidateQueries({ queryKey: ["owner-gym-fighters"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">
              COACH <span className="text-primary">DASHBOARD</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Manage your gyms, roster, proposals, and events.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
              {[
                { label: "Gyms", value: myGyms.length },
                { label: "Fighters", value: allFighters.length },
                { label: "Pending", value: pendingProposals.length },
                { label: "Confirmed", value: confirmedProposals.length },
                { label: "Events", value: events.length },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="font-heading text-3xl text-foreground mt-1">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="gyms" className="space-y-6">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="gyms">
                  <Building2 className="h-4 w-4 mr-1" /> Gyms
                </TabsTrigger>
                <TabsTrigger value="roster">
                  <Users className="h-4 w-4 mr-1" /> Roster
                </TabsTrigger>
                <TabsTrigger value="proposals">
                  <Inbox className="h-4 w-4 mr-1" /> Proposals
                </TabsTrigger>
                <TabsTrigger value="events">
                  <Calendar className="h-4 w-4 mr-1" /> Events
                </TabsTrigger>
              </TabsList>

              {/* Gyms Tab */}
              <TabsContent value="gyms">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-2xl text-foreground">
                    MY <span className="text-primary">GYMS</span>
                  </h2>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => setShowCreateGym(!showCreateGym)}
                  >
                    <Plus className="h-3 w-3" /> Create Gym
                  </Button>
                </div>

                {showCreateGym && (
                  <div className="rounded-lg border border-border bg-card p-6 mb-6">
                    <h3 className="font-heading text-lg text-foreground mb-4">
                      NEW GYM
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <Label>Gym Name</Label>
                        <Input
                          value={newGymName}
                          onChange={(e) => setNewGymName(e.target.value)}
                          placeholder="e.g. Tiger Muay Thai"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Location</Label>
                        <Input
                          value={newGymLocation}
                          onChange={(e) => setNewGymLocation(e.target.value)}
                          placeholder="e.g. London, UK"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Country</Label>
                        <Select
                          value={newGymCountry}
                          onValueChange={(v) =>
                            setNewGymCountry(v as CountryCode)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1 mb-4">
                      <Label>Description</Label>
                      <Textarea
                        value={newGymDescription}
                        onChange={(e) => setNewGymDescription(e.target.value)}
                        placeholder="About your gym..."
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => createGymMutation.mutate()}
                        disabled={
                          !newGymName || createGymMutation.isPending
                        }
                      >
                        {createGymMutation.isPending
                          ? "Creating..."
                          : "Create Gym"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setShowCreateGym(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {myGyms.length === 0 && !showCreateGym ? (
                  <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      You haven't created any gyms yet.
                    </p>
                    <Button
                      onClick={() => setShowCreateGym(true)}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" /> Create Your First Gym
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myGyms.map((gym) => (
                      <div
                        key={gym.id}
                        className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 transition-colors"
                      >
                        <Link to={`/gyms/${gym.id}`}>
                          <h3 className="font-heading text-lg text-foreground">
                            {gym.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {gym.location} · {gym.country}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {gym.fighter_gym_links?.length ?? 0} fighters
                          </p>
                        </Link>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 flex-1"
                            onClick={() => {
                              setAddFighterGymId(gym.id);
                              setShowAddFighter(true);
                            }}
                          >
                            <Plus className="h-3 w-3" /> Add Fighter
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            asChild
                          >
                            <Link to={`/gyms/${gym.id}`}>
                              <Pencil className="h-3 w-3" /> Edit
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Roster Tab */}
              <TabsContent value="roster">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="font-heading text-2xl text-foreground">
                      FIGHTER <span className="text-primary">ROSTER</span>
                    </h2>
                    {myGyms.length > 1 && (
                      <Select value={rosterGymFilter} onValueChange={setRosterGymFilter}>
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Gyms</SelectItem>
                          {myGyms.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {myGyms.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={addFighterGymId ?? primaryGym?.id ?? ""}
                        onValueChange={(v) => setAddFighterGymId(v)}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Select gym" />
                        </SelectTrigger>
                        <SelectContent>
                          {myGyms.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          if (!addFighterGymId && primaryGym) setAddFighterGymId(primaryGym.id);
                          setShowAddFighter(true);
                        }}
                        disabled={!addFighterGymId && !primaryGym}
                      >
                        <Plus className="h-3 w-3" /> Add Fighter
                      </Button>
                    </div>
                  )}
                </div>

                {filteredRosterFighters.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      No fighters in your roster yet.
                    </p>
                    <Button
                      onClick={() => setShowAddFighter(true)}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" /> Add Your First Fighter
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredRosterFighters.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <p className="font-medium text-foreground">{f.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {f.record_wins}W-{f.record_losses}L-{f.record_draws}D
                          · {formatEnum(f.weight_class)}
                        </p>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {f.style && (
                            <Badge variant="outline" className="text-xs">
                              {formatEnum(f.style)}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {f.country}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              f.available
                                ? "text-success border-success/30"
                                : "text-destructive border-destructive/30"
                            }`}
                          >
                            {f.available ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs flex-1"
                            onClick={() => setEditFighter(f)}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs flex-1"
                            onClick={() => setFightResultFighter({ id: f.id, name: f.name })}
                          >
                            <FileText className="h-3 w-3" /> Add Result
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-destructive hover:text-destructive"
                            onClick={() => setDeleteFighter({ id: f.id, name: f.name })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Proposals Tab */}
              <TabsContent value="proposals">
                <h2 className="font-heading text-2xl text-foreground mb-4">
                  MATCH <span className="text-primary">PROPOSALS</span>
                </h2>
                {pendingProposals.length === 0 ? (
                  <p className="text-muted-foreground">
                    No proposals requiring your review.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingProposals.map((p: any) => (
                      <ProposalCard
                        key={p.id}
                        proposal={p}
                        userId={user!.id}
                        userRole="coach"
                        coachFighterIds={fighterIds}
                        onActionComplete={handleRefresh}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-2xl text-foreground">
                    MY <span className="text-primary">EVENTS</span>
                  </h2>
                  <Button size="sm" className="gap-1" asChild>
                    <Link to="/organiser/create-event">
                      <Plus className="h-3 w-3" /> Create Event
                    </Link>
                  </Button>
                </div>

                {events.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">
                      You haven't created any events yet.
                    </p>
                    <Button asChild>
                      <Link to="/organiser/create-event">
                        Create Your First Event
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event: any) => {
                      const eventSlots = event.fight_slots ?? [];
                      const openSlots = eventSlots.filter(
                        (s: any) => s.status === "open"
                      ).length;
                      return (
                        <Link
                          key={event.id}
                          to={`/organiser/events/${event.id}`}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">
                                {event.title}
                              </p>
                              <Badge
                                variant="outline"
                                className={
                                  STATUS_COLORS[event.status] || ""
                                }
                              >
                                {event.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {event.date} · {event.location} ·{" "}
                              {eventSlots.length} slots ({openSlots} open)
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {user && (addFighterGymId || primaryGym?.id) && (
              <AddFighterToGymDialog
                open={showAddFighter}
                onOpenChange={setShowAddFighter}
                coachId={user.id}
                gymId={addFighterGymId || primaryGym!.id}
                onSuccess={handleRefresh}
              />
            )}

            {user && fightResultFighter && (
              <AddFightResultDialog
                open={!!fightResultFighter}
                onOpenChange={(open) => { if (!open) setFightResultFighter(null); }}
                fighter={fightResultFighter}
                coachId={user.id}
                onSuccess={handleRefresh}
              />
            )}

            {editFighter && (
              <EditFighterDialog
                open={!!editFighter}
                onOpenChange={(open) => { if (!open) setEditFighter(null); }}
                fighter={editFighter}
                onSuccess={handleRefresh}
              />
            )}

            {deleteFighter && (
              <DeleteFighterDialog
                open={!!deleteFighter}
                onOpenChange={(open) => { if (!open) setDeleteFighter(null); }}
                fighter={deleteFighter}
                gymId={primaryGym?.id}
                removeFromGymOnly={false}
                onSuccess={handleRefresh}
              />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
