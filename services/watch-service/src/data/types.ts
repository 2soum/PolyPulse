/**
 * Data layer — domain types for the watchlist and price snapshots.
 */
export interface WatchedMarket {
  marketId: string;
  addedAt: string; // ISO timestamp
}

export interface Snapshot {
  marketId: string;
  ts: string; // ISO timestamp
  yesPrice: number | null;
  volume24h: number;
}
