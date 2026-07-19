import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchLeaderboard } from "@/lib/leaderboard";

const BG = "#080a0d";
const SURFACE = "#111318";
const INSET = "#181c24";
const GOLD = "#e8a020";
const GOLD_TINT = "rgba(232,160,32,0.12)";
const TEXT = "#e8eaf0";
const MUTED = "#8b909e";

type Scope = "global" | "gym";

export default function Leaderboard() {
  const [params, setParams] = useSearchParams();
  const initialGym = params.get("gym") || "";
  const [scope, setScope] = useState<Scope>(initialGym ? "gym" : "global");
  const [gymId, setGymId] = useState<string>(initialGym);
  const [search, setSearch] = useState("");

  const { data: gyms = [] } = useQuery({
    queryKey: ["leaderboard-gym-picker"],
    queryFn: async () => {
      const { data } = await supabase.from("gyms").select("id, name").eq("review_status", "approved").order("name").limit(500);
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["leaderboard", scope, gymId],
    queryFn: () => fetchLeaderboard({ gymId: scope === "gym" ? gymId : null, limit: 200 }),
    enabled: scope === "global" || !!gymId,
  });

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const setScopeAndSync = (s: Scope) => {
    setScope(s);
    if (s === "global") { setGymId(""); setParams({}); }
  };

  const setGymAndSync = (id: string) => {
    setGymId(id);
    setParams(id ? { gym: id } : {});
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <SEO title="MU Score Leaderboard" description="Global and gym MU Score rankings for combat sports fighters on MatchUp." />
      <Header />
      <main className="pt-20 pb-16">
        <div className="mx-auto" style={{ maxWidth: 1100, padding: "0 24px" }}>
          <Link to="/explore?tab=fighters" className="inline-flex items-center gap-2 mb-4" style={{ color: MUTED, fontSize: 13 }}>
            <ArrowLeft className="w-4 h-4" /> Back to Explore
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: GOLD_TINT }}>
              <Trophy className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, letterSpacing: "0.04em", color: TEXT, lineHeight: 1 }}>
                MU SCORE LEADERBOARD
              </h1>
              <p style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
                Rankings by MU Score — updated after every verified fight.
              </p>
            </div>
          </div>

          {/* Scope toggle */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="inline-flex rounded-lg p-1" style={{ background: INSET }}>
              {(["global", "gym"] as Scope[]).map((s) => (
                <button key={s} onClick={() => setScopeAndSync(s)} style={{
                  padding: "8px 18px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  background: scope === s ? GOLD_TINT : "transparent", color: scope === s ? GOLD : MUTED,
                  border: "none", cursor: "pointer",
                }}>
                  {s === "global" ? "Global" : "By Gym"}
                </button>
              ))}
            </div>
            {scope === "gym" && (
              <select value={gymId} onChange={(e) => setGymAndSync(e.target.value)} style={{
                background: INSET, color: TEXT, border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13,
              }}>
                <option value="">Select a gym…</option>
                {gyms.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
            <Input placeholder="Search fighters…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs" />
          </div>

          {/* Table */}
          <div style={{ background: SURFACE, borderRadius: 12, overflow: "hidden" }}>
            <div className="grid" style={{
              gridTemplateColumns: "60px 1fr 1fr 100px", padding: "12px 16px",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: MUTED, textTransform: "uppercase",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div>Rank</div><div>Fighter</div><div>Gym</div><div style={{ textAlign: "right" }}>MU Score</div>
            </div>
            {isLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: MUTED }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: MUTED }}>
                {scope === "gym" && !gymId ? "Pick a gym to see its leaderboard." : "No fighters yet."}
              </div>
            ) : filtered.map((r) => (
              <Link key={r.id} to={`/fighters/${r.id}`} className="grid items-center hover:bg-white/[0.03]" style={{
                gridTemplateColumns: "60px 1fr 1fr 100px", padding: "12px 16px", color: TEXT, textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: r.rank <= 3 ? GOLD : MUTED }}>
                  #{r.rank}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                <div style={{ color: MUTED, fontSize: 13 }}>{r.gym_name ?? "Independent"}</div>
                <div style={{ textAlign: "right", fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: GOLD }}>
                  {r.elo_rating}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
