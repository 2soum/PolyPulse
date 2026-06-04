/**
 * Data layer — domain types for normalized Polymarket markets.
 */
export interface BoostInfo {
  /** A market is "boosted" when it offers liquidity or holding rewards. */
  boosted: boolean;
  /** Composite attractiveness of the boost, 0–100. */
  score: number;
  /** Minimum order size eligible for LP rewards (0 = none). */
  minSize: number;
  /** Maximum spread (cents) still earning rewards. */
  maxSpread: number;
  /** Whether simply holding the position earns rewards. */
  holdingRewards: boolean;
}

export interface NormalizedMarket {
  id: string;
  slug: string;
  question: string;
  category: string;
  icon?: string;
  outcomes: string[];
  prices: number[];
  /** Price of the "Yes"/first outcome, 0–1 (null if unavailable). */
  yesPrice: number | null;
  volume24h: number;
  liquidity: number;
  spread: number;
  oneDayChange: number | null;
  oneWeekChange: number | null;
  endDate?: string;
  boost: BoostInfo;
}
