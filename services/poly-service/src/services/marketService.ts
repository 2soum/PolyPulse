import { NormalizedMarket } from '../data/types';
import { CategoryRepository } from '../data/categoryRepository';
import { PolymarketClient } from './polymarketClient';
import { normalizeMarket } from './marketNormalizer';

/**
 * Service layer — orchestrates the external client (Data source) and the
 * category catalog (Data layer) to expose boosted markets.
 */
export class MarketService {
  constructor(
    private readonly client: PolymarketClient,
    private readonly categories: CategoryRepository,
  ) {}

  /** Returns the most-traded *boosted* markets, optionally filtered by category. */
  async getBoosted(limit: number, category?: string): Promise<NormalizedMarket[]> {
    // Over-fetch so the boosted/category filter still yields `limit` results.
    const raw = await this.client.fetchMarkets(Math.min(limit * 4, 200));
    let markets = raw
      .map((m) => normalizeMarket(m, this.categories))
      .filter((m) => m.boost.boosted);

    if (category) {
      markets = markets.filter((m) => m.category === category);
    }
    markets.sort((a, b) => b.volume24h - a.volume24h);
    return markets.slice(0, limit);
  }

  /** Returns a single normalized market, or null if it does not exist. */
  async getMarket(id: string): Promise<NormalizedMarket | null> {
    const raw = await this.client.fetchMarket(id);
    return raw ? normalizeMarket(raw, this.categories) : null;
  }

  listCategories(): string[] {
    return this.categories.categories();
  }
}
