import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Step {
  key: string;
  anchor: "explore" | "my-content" | "notifications" | "account";
  copy: string;
}

interface DashboardTutorialProps {
  role: AppRole | null;
  open: boolean;
  onDismiss: () => void;
  onOpenMobileSidebar?: () => void;
}

const BASE_STEPS: Step[] = [
  { key: "explore", anchor: "explore",
    copy: "This is where you find your network — search fighters, gyms, and events across the UK." },
  { key: "my-content", anchor: "my-content",
    copy: "Anything you've added — your profile, gyms, or events — lives here. Edit or update it any time." },
  { key: "notifications", anchor: "notifications",
    copy: "Match requests, follow requests, gym claims and event applications all land here. You'll see a badge whenever something needs your attention." },
  { key: "interactions", anchor: "notifications",
    copy: "Send a match request and it starts as Pending — the other fighter can Accept or Decline, and both sides get notified. Gym claims go to the gym owner and event applications go to the organiser." },
  { key: "account", anchor: "account",
    copy: "Manage your account here, including updating your password and notification preferences." },
];

// Fighter-only extra steps — reuse existing anchors so no dashboard markup changes are needed.
const FIGHTER_EXTRA_STEPS: Step[] = [
  { key: "fighter-profile", anchor: "my-content",
    copy: "Keep your profile sharp: photo, weight class, discipline, record, and a socials link. Organisers and coaches see this first." },
  { key: "fighter-availability", anchor: "my-content",
    copy: "Toggle Available for a match when you're ready to fight. Coaches and organisers filter by availability when building cards." },
  { key: "fighter-record", anchor: "my-content",
    copy: "Your MU Score updates from verified fights only. Head to the Leaderboard from Explore to see where you rank globally or in your gym." },
  { key: "fighter-matchmaking", anchor: "explore",
    copy: "Organisers use Matchmaking to shortlist fighters for their events. A strong, complete profile puts you at the top of that list." },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getRect(anchor: string): Rect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector<HTMLElement>(`[data-tutorial="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function DashboardTutorial({
  role,
  open,
  onDismiss,
  onOpenMobileSidebar,
}: DashboardTutorialProps) {
  const isMobile = useIsMobile();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Resolve which of the three anchors are actually mountable in the DOM.
  // Recomputed briefly at open to allow the sidebar to render.
  const [availableSteps, setAvailableSteps] = useState<Step[] | null>(null);

  const close = useCallback(() => {
    if (dismissed) return;
    setDismissed(true);
    onDismiss();
  }, [dismissed, onDismiss]);

  // On open: (optionally) open the mobile sidebar, then discover which anchors exist.
  useEffect(() => {
    if (!open || dismissed) return;

    let cancelled = false;
    if (isMobile && onOpenMobileSidebar) onOpenMobileSidebar();

    // Give the sidebar / DOM a beat to render before probing.
    const timeout = setTimeout(() => {
      if (cancelled) return;
      const allSteps = role === "fighter" ? [...BASE_STEPS, ...FIGHTER_EXTRA_STEPS] : BASE_STEPS;
      const steps: Step[] = allSteps.filter((s) => getRect(s.anchor) != null);

      if (steps.length === 0) {
        // No anchors present — persist dismissal so we don't loop next time.
        close();
        return;
      }
      setAvailableSteps(steps);
      setStepIndex(0);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // Only re-run on `open` transitioning true. onOpenMobileSidebar / isMobile
    // shouldn't retrigger discovery mid-flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const currentStep = availableSteps?.[stepIndex] ?? null;

  // Recompute target rect on step change, and re-open the mobile sidebar for
  // sidebar-anchored steps so the target is on screen.
  useEffect(() => {
    if (!currentStep) return;
    if (isMobile && onOpenMobileSidebar && (currentStep.anchor === "explore" || currentStep.anchor === "my-content")) {
      onOpenMobileSidebar();
    }
    // small delay so the drawer transition can complete
    const t = setTimeout(() => setRect(getRect(currentStep.anchor)), 220);
    return () => clearTimeout(t);
  }, [currentStep, isMobile, onOpenMobileSidebar]);

  // Keep rect fresh on resize / scroll.
  useEffect(() => {
    if (!currentStep) return;
    const update = () => setRect(getRect(currentStep.anchor));
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [currentStep]);

  // Escape key => same close() as every other exit path.
  useEffect(() => {
    if (!open || dismissed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissed, close]);

  const handleNext = () => {
    if (!availableSteps) return;
    if (stepIndex >= availableSteps.length - 1) {
      close();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const tooltipPos = useMemo(() => {
    if (!rect) return null;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const CARD_W = Math.min(320, vw - 24);
    const CARD_H_APPROX = 190;
    const GAP = 12;

    const spaceBelow = vh - (rect.top + rect.height) - GAP;
    const spaceAbove = rect.top - GAP;
    const placeBelow = spaceBelow >= CARD_H_APPROX || spaceBelow >= spaceAbove;

    let top = placeBelow ? rect.top + rect.height + GAP : rect.top - CARD_H_APPROX - GAP;
    top = Math.max(12, Math.min(top, vh - CARD_H_APPROX - 12));

    // Prefer aligning to the target, but keep card fully on screen.
    let left = rect.left + rect.width / 2 - CARD_W / 2;
    left = Math.max(12, Math.min(left, vw - CARD_W - 12));

    return { top, left, width: CARD_W };
  }, [rect]);

  if (!open || dismissed || !availableSteps || !currentStep || !rect || !tooltipPos) {
    return null;
  }

  const total = availableSteps.length;
  const isLast = stepIndex >= total - 1;

  const overlay = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard tour"
    >
      {/* Backdrop click-catcher */}
      <div
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "auto",
          background: "transparent",
        }}
      />

      {/* Spotlight cut-out via massive box-shadow */}
      <div
        style={{
          position: "fixed",
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: 10,
          boxShadow:
            "0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px rgba(232,160,32,0.6), 0 0 24px rgba(232,160,32,0.35)",
          transition: "top 0.18s ease, left 0.18s ease, width 0.18s ease, height 0.18s ease",
          pointerEvents: "none",
        }}
      />

      {/* Tooltip card */}
      <div
        style={{
          position: "fixed",
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: tooltipPos.width,
          background: "#111318",
          borderRadius: 12,
          padding: 16,
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          pointerEvents: "auto",
          color: "#e8eaf0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 12,
              letterSpacing: "0.08em",
              color: "#e8a020",
            }}
          >
            STEP {stepIndex + 1} OF {total}
          </span>
          <button
            onClick={close}
            style={{
              background: "transparent",
              border: "none",
              color: "#8b909e",
              fontSize: 11,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Skip tutorial
          </button>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "#e8eaf0", margin: 0 }}>
          {currentStep.copy}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <Button size="sm" onClick={handleNext}>
            {isLast ? "Got it" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
