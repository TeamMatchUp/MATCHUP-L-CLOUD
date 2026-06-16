import { FighterAnalyticsV2 } from "./FighterAnalytics";
import { CoachAnalyticsV2 } from "./CoachAnalytics";
import { OrganiserAnalyticsShared } from "./OrganiserAnalytics";

interface DashboardAnalyticsProps {
  isCoachOrOwner: boolean;
  isOrganiser: boolean;
  isFighter: boolean;
  myGyms: any[];
  allFighters: any[];
  events: any[];
  fighterProfile: any | null;
  userId: string;
}

export function DashboardAnalytics(props: DashboardAnalyticsProps) {
  const { isCoachOrOwner, isOrganiser, isFighter, fighterProfile, userId } = props;

  // When a user has both coach and fighter roles, label the two analytics
  // panels distinctly so it's clear which set covers the gym/roster and which
  // covers their own fighter stats.
  const dualRole = isCoachOrOwner && isFighter && !!fighterProfile;
  const coachTitle = dualRole ? "Gym Analytics" : "Analytics";
  const fighterTitle = dualRole ? "Fighter Analytics" : "";
  const fighterOnlyTitle = dualRole ? fighterTitle : "Analytics";

  return (
    <div className="space-y-8">
      {isCoachOrOwner && <CoachAnalyticsV2 userId={userId} title={coachTitle} />}
      {isFighter && fighterProfile && (
        <FighterAnalyticsV2
          fighterProfile={fighterProfile}
          title={isCoachOrOwner ? fighterTitle : fighterOnlyTitle}
        />
      )}
      {isOrganiser && !isCoachOrOwner && (
        <OrganiserAnalyticsShared userId={userId} title="Analytics" />
      )}
      {!isCoachOrOwner && !isFighter && !isOrganiser && (
        <p className="text-muted-foreground text-center py-12">No analytics available for your role yet.</p>
      )}
    </div>
  );
}

