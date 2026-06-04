import { Snapshot } from './types';

/**
 * Data layer — time series of price/volume snapshots, powering the sparklines.
 */
export interface SnapshotRepository {
  add(snapshot: Snapshot): Promise<Snapshot>;
  /** Snapshots for a market, oldest first, optionally capped to the last N. */
  list(marketId: string, limit?: number): Promise<Snapshot[]>;
  deleteFor(marketId: string): Promise<void>;
}

export class InMemorySnapshotRepository implements SnapshotRepository {
  private readonly store = new Map<string, Snapshot[]>();

  constructor(seed: Snapshot[] = []) {
    for (const snap of seed) this.appendInternal(snap);
  }

  private appendInternal(snapshot: Snapshot): void {
    const list = this.store.get(snapshot.marketId) ?? [];
    list.push(snapshot);
    this.store.set(snapshot.marketId, list);
  }

  async add(snapshot: Snapshot): Promise<Snapshot> {
    this.appendInternal(snapshot);
    return snapshot;
  }

  async list(marketId: string, limit?: number): Promise<Snapshot[]> {
    const list = [...(this.store.get(marketId) ?? [])].sort((a, b) => a.ts.localeCompare(b.ts));
    return limit ? list.slice(-limit) : list;
  }

  async deleteFor(marketId: string): Promise<void> {
    this.store.delete(marketId);
  }
}
