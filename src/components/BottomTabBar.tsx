import { useSearchParams } from "react-router-dom";
import { Home, Calendar, Users, Inbox } from "lucide-react";

const tabs = [
  { key: "overview", label: "Home", icon: Home },
  { key: "events", label: "Events", icon: Calendar },
  { key: "roster", label: "Roster", icon: Users },
  { key: "proposals", label: "Proposals", icon: Inbox },
];

export function BottomTabBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "overview";

  const handleNav = (key: string) => {
    setSearchParams({ section: key });
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <nav className="mu-tab-bar">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleNav(tab.key)}
              className={`mu-tab-item ${isActive ? "active" : ""}`}
            >
              <tab.icon
                className="w-[18px] h-[18px]"
                strokeWidth={1.2}
                style={{ color: isActive ? "var(--mu-gold)" : "var(--mu-t3)" }}
              />
              <span className="mu-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
