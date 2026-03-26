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

  return (
    <div className="space-y-8">
      {isCoachOrOwner && <CoachAnalyticsV2 userId={userId} />}
      {isFighter && fighterProfile && <FighterAnalyticsV2 fighterProfile={fighterProfile} />}
      {isOrganiser && !isCoachOrOwner && <OrganiserAnalyticsShared userId={userId} />}
      {!isCoachOrOwner && !isFighter && !isOrganiser && (
        <p className="text-muted-foreground text-center py-12">No analytics available for your role yet.</p>
      )}
    </div>
  );
}
