export type BoostTierId = "24h" | "7d" | "14d" | "30d";

export interface BoostTier {
  id: BoostTierId;
  label: string;
  duration: string;
  price: number;
  durationMs: number;
  badge?: string;
}

export const BOOST_TIERS: BoostTier[] = [
  { id: "24h", label: "24 Hours",  duration: "1 day",   price: 7.99,  durationMs: 24 * 3600 * 1000 },
  { id: "7d",  label: "7 Days",    duration: "1 week",  price: 44.99, durationMs: 7 * 24 * 3600 * 1000 },
  { id: "14d", label: "14 Days",   duration: "2 weeks", price: 69.99, durationMs: 14 * 24 * 3600 * 1000 },
  { id: "30d", label: "30 Days",   duration: "1 month", price: 99.99, durationMs: 30 * 24 * 3600 * 1000, badge: "Best Value" },
];

export const getTier = (id: BoostTierId) => BOOST_TIERS.find((t) => t.id === id)!;
