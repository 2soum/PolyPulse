import { WatchRepository } from '../data/watchRepository';
import { SnapshotRepository } from '../data/snapshotRepository';
import { PolyGateway, Market } from './polyGateway';
import { NotFoundError, ValidationError } from '../errors';

export interface DashboardRow {
  market: Market;
  addedAt: string;
  /** yesPrice history (oldest → newest) for the sparkline. */
  sparkline: number[];
}

export interface DashboardKpis {
  watched: number;
  totalVolume24h: number;
  avgBoostScore: number;
  topMover: { marketId: string; question: string; oneDayChange: number } | null;
}

export interface Dashboard {
  kpis: DashboardKpis;
  rows: DashboardRow[];
}

type Clock = () => Date;

/**
 * Service layer — watchlist business logic. Combines the Data layer
 * (watch + snapshot repositories) with live data from poly-service.
 */
export class WatchService {
  constructor(
    private readonly watch: WatchRepository,
    private readonly snapshots: SnapshotRepository,
    private readonly poly: PolyGateway,
    private readonly now: Clock = () => new Date(),
  ) {}

  discover(limit: number, category?: string): Promise<Market[]> {
    return this.poly.getBoosted(limit, category);
  }

  categories(): Promise<string[]> {
    return this.poly.getCategories();
  }

  async addMarket(marketId: string): Promise<Market> {
    if (!marketId || !marketId.trim()) {
      throw new ValidationError('marketId is required');
    }
    if (await this.watch.get(marketId)) {
      throw new ValidationError('market already in watchlist');
    }
    const market = await this.poly.getMarket(marketId);
    if (!market) {
      throw new NotFoundError(`market ${marketId} not found`);
    }
    const ts = this.now().toISOString();
    await this.watch.add({ marketId, addedAt: ts });
    await this.snapshots.add({
      marketId,
      ts,
      yesPrice: market.yesPrice,
      volume24h: market.volume24h,
    });
    return market;
  }

  async removeMarket(marketId: string): Promise<void> {
    const deleted = await this.watch.delete(marketId);
    if (!deleted) {
      throw new NotFoundError(`market ${marketId} not found`);
    }
    await this.snapshots.deleteFor(marketId);
  }

  /**
   * Builds the dashboard: refreshes every watched market from poly-service,
   * records a fresh snapshot, and aggregates KPIs.
   */
  async getDashboard(): Promise<Dashboard> {
    const watched = await this.watch.list();
    const ts = this.now().toISOString();

    const rows: DashboardRow[] = [];
    for (const entry of watched) {
      const market = await this.poly.getMarket(entry.marketId);
      if (!market) continue; // market resolved/closed → skip
      await this.snapshots.add({
        marketId: market.id,
        ts,
        yesPrice: market.yesPrice,
        volume24h: market.volume24h,
      });
      const history = await this.snapshots.list(market.id, 50);
      rows.push({
        market,
        addedAt: entry.addedAt,
        sparkline: history.map((s) => s.yesPrice ?? 0),
      });
    }

    return { kpis: computeKpis(rows), rows };
  }
}

export function computeKpis(rows: DashboardRow[]): DashboardKpis {
  const totalVolume24h = rows.reduce((acc, r) => acc + r.market.volume24h, 0);
  const avgBoostScore =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((acc, r) => acc + r.market.boost.score, 0) / rows.length);

  let topMover: DashboardKpis['topMover'] = null;
  for (const r of rows) {
    const change = r.market.oneDayChange;
    if (change === null) continue;
    if (!topMover || Math.abs(change) > Math.abs(topMover.oneDayChange)) {
      topMover = { marketId: r.market.id, question: r.market.question, oneDayChange: change };
    }
  }

  return { watched: rows.length, totalVolume24h, avgBoostScore, topMover };
}
