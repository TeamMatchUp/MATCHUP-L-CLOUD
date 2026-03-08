/**
 * Shared formatting utilities for enum display values.
 */

export const STYLE_LABELS: Record<string, string> = {
  boxing: "Boxing",
  muay_thai: "Muay Thai",
  mma: "MMA",
  kickboxing: "Kick Boxing",
  bjj: "BJJ",
};

export function formatEnum(val: string): string {
  // Check style labels first for correct casing
  if (val in STYLE_LABELS) return STYLE_LABELS[val];
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
