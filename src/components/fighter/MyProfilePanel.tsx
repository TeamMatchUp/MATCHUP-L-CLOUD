import { formatEnum } from "@/lib/format";

interface GymLink {
  id: string;
  status: string;
  gym: { id: string; name: string } | null;
}

interface MyProfilePanelProps {
  fighterProfile: any;
  gymLinks: GymLink[];
}

const MANDATORY_FIELDS = [
  "date_of_birth",
  "walk_around_weight_kg",
  "height",
  "reach",
  "stance",
  "discipline",
  "weight_class",
] as const;

export function MyProfilePanel({ fighterProfile, gymLinks }: MyProfilePanelProps) {
  const p = fighterProfile;
  const hasIncomplete = MANDATORY_FIELDS.some((f) => !p[f]);

  const approvedGym = gymLinks.find((gl) => gl.status === "accepted" || gl.status === "approved");
  const pendingGym = gymLinks.find((gl) => gl.status === "pending");

  let gymDisplay: string;
  if (approvedGym) {
    gymDisplay = approvedGym.gym?.name ?? "Gym";
  } else if (pendingGym) {
    gymDisplay = `Pending — ${pendingGym.gym?.name ?? "Gym"}`;
  } else {
    gymDisplay = "No gym affiliated";
  }

  const rows: { label: string; value: string }[] = [
    { label: "Weight Class", value: formatEnum(p.weight_class) },
    { label: "Discipline", value: p.discipline ? formatEnum(p.discipline) : "—" },
    { label: "Stance", value: p.stance ?? "—" },
    { label: "Fighting Style", value: p.fighting_substyle ?? "—" },
    { label: "Height", value: p.height ? `${p.height} cm` : "—" },
    { label: "Reach", value: p.reach ? `${p.reach} cm` : "—" },
    { label: "Walk-around Weight", value: p.walk_around_weight_kg ? `${p.walk_around_weight_kg} kg` : "—" },
    { label: "Pro Record", value: `${p.record_wins}W-${p.record_losses}L-${p.record_draws}D` },
    { label: "Amateur Record", value: `${p.amateur_wins ?? 0}W-${p.amateur_losses ?? 0}L-${p.amateur_draws ?? 0}D` },
    { label: "Gym", value: gymDisplay },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-heading text-lg text-foreground mb-3 flex items-center gap-2">
        MY <span className="text-primary">PROFILE</span>
        {hasIncomplete && (
          <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
        )}
      </h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={`text-foreground font-medium ${r.value === "—" ? "text-muted-foreground" : ""}`}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
