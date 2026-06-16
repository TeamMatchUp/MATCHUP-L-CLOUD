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

  // For coaches, the gym/roster analytics are labelled "Gym Analytics" and
  // the personal fighter analytics below them are labelled "Fighter Analytics"
  // so the two sets are clearly distinguished.
  const coachTitle = isCoachOrOwner ? "Gym Analytics" : "Analytics";
  const fighterTitle = isCoachOrOwner ? "Fighter Analytics" : "Analytics";

  return (
    <div className="space-y-8">
      {isCoachOrOwner && <CoachAnalyticsV2 userId={userId} title={coachTitle} />}
      {isFighter && fighterProfile && (
        <FighterAnalyticsV2 fighterProfile={fighterProfile} title={fighterTitle} />
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


