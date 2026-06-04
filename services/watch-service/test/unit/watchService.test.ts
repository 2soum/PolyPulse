import { WatchService, computeKpis, DashboardRow } from '../../src/services/watchService';
import { InMemoryWatchRepository } from '../../src/data/watchRepository';
import { InMemorySnapshotRepository } from '../../src/data/snapshotRepository';
import { PolyGateway, Market } from '../../src/services/polyGateway';
import { NotFoundError, ValidationError } from '../../src/errors';

function market(over: Partial<Market> = {}): Market {
  return {
    id: 'm1',
    slug: 'slug',
    question: 'Will X happen?',
    category: 'Crypto',
    outcomes: ['Yes', 'No'],
    prices: [0.6, 0.4],
    yesPrice: 0.6,
    volume24h: 1000,
    liquidity: 5000,
    spread: 0.01,
    oneDayChange: 0.05,
    oneWeekChange: 0.1,
    boost: { boosted: true, score: 90, minSize: 100, maxSpread: 2.5, holdingRewards: true },
    ...over,
  };
}

function gateway(markets: Market[]): PolyGateway {
  return {
    getBoosted: jest.fn().mockResolvedValue(markets),
    getCategories: jest.fn().mockResolvedValue(['Crypto', 'Sports']),
    getMarket: jest.fn(async (id: string) => markets.find((m) => m.id === id) ?? null),
  };
}

const fixedClock = () => new Date('2026-06-04T12:00:00Z');

function buildService(markets: Market[]) {
  const watch = new InMemoryWatchRepository();
  const snapshots = new InMemorySnapshotRepository();
  const service = new WatchService(watch, snapshots, gateway(markets), fixedClock);
  return { watch, snapshots, service };
}

describe('WatchService.addMarket', () => {
  it('adds a market and records the first snapshot', async () => {
    const { watch, snapshots, service } = buildService([market()]);
    const added = await service.addMarket('m1');

    expect(added.id).toBe('m1');
    expect(await watch.get('m1')).toEqual({ marketId: 'm1', addedAt: '2026-06-04T12:00:00.000Z' });
    const snaps = await snapshots.list('m1');
    expect(snaps).toHaveLength(1);
    expect(snaps[0].yesPrice).toBe(0.6);
  });

  it('rejects an empty marketId', async () => {
    const { service } = buildService([market()]);
    await expect(service.addMarket('   ')).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a duplicate', async () => {
    const { service } = buildService([market()]);
    await service.addMarket('m1');
    await expect(service.addMarket('m1')).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws NotFound when poly-service does not know the market', async () => {
    const { service } = buildService([market()]);
    await expect(service.addMarket('ghost')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('WatchService.removeMarket', () => {
  it('removes a market and its snapshots', async () => {
    const { snapshots, service } = buildService([market()]);
    await service.addMarket('m1');
    await service.removeMarket('m1');
    expect(await snapshots.list('m1')).toEqual([]);
  });

  it('throws NotFound for an unknown market', async () => {
    const { service } = buildService([market()]);
    await expect(service.removeMarket('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('WatchService.getDashboard', () => {
  it('refreshes markets, builds sparklines and KPIs', async () => {
    const markets = [
      market({ id: 'a', volume24h: 1000, oneDayChange: 0.02, boost: { boosted: true, score: 80, minSize: 1, maxSpread: 1, holdingRewards: true } }),
      market({ id: 'b', volume24h: 4000, oneDayChange: -0.3, boost: { boosted: true, score: 60, minSize: 1, maxSpread: 1, holdingRewards: false } }),
    ];
    const { service } = buildService(markets);
    await service.addMarket('a');
    await service.addMarket('b');

    const dash = await service.getDashboard();

    expect(dash.rows).toHaveLength(2);
    expect(dash.kpis.watched).toBe(2);
    expect(dash.kpis.totalVolume24h).toBe(5000);
    expect(dash.kpis.avgBoostScore).toBe(70);
    expect(dash.kpis.topMover?.marketId).toBe('b'); // |−0.3| is the biggest move
    // addMarket recorded one snapshot, getDashboard adds another → sparkline length 2
    const rowA = dash.rows.find((r) => r.market.id === 'a');
    expect(rowA?.sparkline).toHaveLength(2);
  });

  it('skips markets that poly-service no longer returns', async () => {
    const { watch, service } = buildService([market({ id: 'a' })]);
    await service.addMarket('a');
    // Manually add a stale entry whose market is unknown to the gateway.
    await watch.add({ marketId: 'stale', addedAt: '2026-06-01T00:00:00Z' });

    const dash = await service.getDashboard();
    expect(dash.rows.map((r) => r.market.id)).toEqual(['a']);
    expect(dash.kpis.watched).toBe(1);
  });
});

describe('computeKpis', () => {
  it('returns zeros and null mover for an empty dashboard', () => {
    const kpis = computeKpis([]);
    expect(kpis).toEqual({ watched: 0, totalVolume24h: 0, avgBoostScore: 0, topMover: null });
  });

  it('ignores rows with a null daily change for the top mover', () => {
    const rows: DashboardRow[] = [
      { market: market({ id: 'x', oneDayChange: null }), addedAt: 't', sparkline: [] },
    ];
    expect(computeKpis(rows).topMover).toBeNull();
  });
});

describe('WatchService passthroughs', () => {
  it('discover delegates to the gateway', async () => {
    const { service } = buildService([market()]);
    expect(await service.discover(5, 'Crypto')).toHaveLength(1);
  });

  it('categories delegates to the gateway', async () => {
    const { service } = buildService([market()]);
    expect(await service.categories()).toContain('Crypto');
  });
});
