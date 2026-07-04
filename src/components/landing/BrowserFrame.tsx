import { ReactNode } from "react";

interface BrowserFrameProps {
  children: ReactNode;
  className?: string;
}

export function BrowserFrame({ children, className = "" }: BrowserFrameProps) {
  return (
    <div
      className={`browser-frame group/frame rounded-xl overflow-hidden bg-[hsl(var(--card))] transition-transform duration-300 ease-out ${className}`}
      style={{
        boxShadow:
          "0 4px 16px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[hsl(var(--bg-raised,var(--accent)))]/80 border-b border-white/[0.04]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex-1 h-4 rounded bg-black/30 max-w-[280px]" />
      </div>
      <div className="relative">{children}</div>

      <style>{`
        .browser-frame:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow:
            0 8px 24px rgba(0,0,0,0.6),
            0 32px 80px rgba(0,0,0,0.55),
            0 0 0 1px hsl(var(--primary) / 0.18),
            0 0 40px hsl(var(--primary) / 0.12),
            inset 0 1px 0 rgba(255,255,255,0.08) !important;
        }
      `}</style>
    </div>
  );
}
