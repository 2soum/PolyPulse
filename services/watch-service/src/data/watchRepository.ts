import { WatchedMarket } from './types';

/**
 * Data layer — persistence of the watched-market list. The service depends only
 * on this interface (in-memory for tests, PostgreSQL at runtime).
 */
export interface WatchRepository {
  list(): Promise<WatchedMarket[]>;
  get(marketId: string): Promise<WatchedMarket | null>;
  add(entry: WatchedMarket): Promise<WatchedMarket>;
  delete(marketId: string): Promise<boolean>;
}

export class InMemoryWatchRepository implements WatchRepository {
  private readonly store = new Map<string, WatchedMarket>();

  constructor(seed: WatchedMarket[] = []) {
    for (const entry of seed) this.store.set(entry.marketId, entry);
  }

  async list(): Promise<WatchedMarket[]> {
    return [...this.store.values()];
  }

  async get(marketId: string): Promise<WatchedMarket | null> {
    return this.store.get(marketId) ?? null;
  }

  async add(entry: WatchedMarket): Promise<WatchedMarket> {
    this.store.set(entry.marketId, entry);
    return entry;
  }

  async delete(marketId: string): Promise<boolean> {
    return this.store.delete(marketId);
  }
}
