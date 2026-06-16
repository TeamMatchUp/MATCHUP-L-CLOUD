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

  // Only the first rendered analytics panel shows the "Analytics" heading
  // to avoid duplicate titles when a user has multiple roles.
  let titleUsed = false;
  const nextTitle = () => {
    if (titleUsed) return "";
    titleUsed = true;
    return "Analytics";
  };

  return (
    <div className="space-y-8">
      {isCoachOrOwner && <CoachAnalyticsV2 userId={userId} title={nextTitle()} />}
      {isFighter && fighterProfile && (
        <FighterAnalyticsV2 fighterProfile={fighterProfile} title={nextTitle()} />
      )}
      {isOrganiser && !isCoachOrOwner && (
        <OrganiserAnalyticsShared userId={userId} title={nextTitle()} />
      )}
      {!isCoachOrOwner && !isFighter && !isOrganiser && (
        <p className="text-muted-foreground text-center py-12">No analytics available for your role yet.</p>
      )}
    </div>
  );
}
