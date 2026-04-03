import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ExplorePagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <button
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        className="flex items-center justify-center transition-all duration-150"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#1a1e28",
          border: "1px solid rgba(255,255,255,0.08)",
          color: page === 0 ? "rgba(139,144,158,0.3)" : "#8b909e",
          cursor: page === 0 ? "default" : "pointer",
          opacity: page === 0 ? 0.3 : 1,
        }}
        onMouseEnter={(e) => {
          if (page > 0) {
            (e.currentTarget as HTMLElement).style.background = "rgba(232,160,32,0.1)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,160,32,0.3)";
            (e.currentTarget as HTMLElement).style.color = "#e8a020";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "#1a1e28";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLElement).style.color = "#8b909e";
        }}
      >
        <ChevronLeft className="h-3 w-3" />
      </button>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>
        Page {page + 1} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        className="flex items-center justify-center transition-all duration-150"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#1a1e28",
          border: "1px solid rgba(255,255,255,0.08)",
          color: page >= totalPages - 1 ? "rgba(139,144,158,0.3)" : "#8b909e",
          cursor: page >= totalPages - 1 ? "default" : "pointer",
          opacity: page >= totalPages - 1 ? 0.3 : 1,
        }}
        onMouseEnter={(e) => {
          if (page < totalPages - 1) {
            (e.currentTarget as HTMLElement).style.background = "rgba(232,160,32,0.1)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,160,32,0.3)";
            (e.currentTarget as HTMLElement).style.color = "#e8a020";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "#1a1e28";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLElement).style.color = "#8b909e";
        }}
      >
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
