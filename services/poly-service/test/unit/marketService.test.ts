import { MarketService } from '../../src/services/marketService';
import { PolymarketClient, RawMarket } from '../../src/services/polymarketClient';
import { KeywordCategoryRepository } from '../../src/data/categoryRepository';

function raw(over: Partial<RawMarket>): RawMarket {
  return {
    id: 'x',
    question: 'Q',
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.5","0.5"]',
    volume24hr: 1000,
    rewardsMinSize: 100,
    holdingRewardsEnabled: false,
    ...over,
  };
}

function clientStub(markets: RawMarket[]): PolymarketClient {
  return {
    fetchMarkets: jest.fn().mockResolvedValue(markets),
    fetchMarket: jest.fn(async (id: string) => markets.find((m) => m.id === id) ?? null),
  };
}

const categories = new KeywordCategoryRepository();

describe('MarketService.getBoosted', () => {
  it('keeps only boosted markets, sorted by 24h volume, limited', async () => {
    const client = clientStub([
      raw({ id: 'a', question: 'Knicks vs. Spurs', volume24hr: 500, rewardsMinSize: 50 }),
      raw({ id: 'b', question: 'Bitcoin price?', volume24hr: 9000, rewardsMinSize: 100 }),
      raw({ id: 'c', question: 'Not boosted', volume24hr: 8000, rewardsMinSize: 0, holdingRewardsEnabled: false }),
    ]);
    const service = new MarketService(client, categories);

    const result = await service.getBoosted(10);
    expect(result.map((m) => m.id)).toEqual(['b', 'a']); // c filtered out, sorted by volume
  });

  it('filters by category when provided', async () => {
    const client = clientStub([
      raw({ id: 'a', question: 'Knicks vs. Spurs', volume24hr: 500 }),
      raw({ id: 'b', question: 'Bitcoin price?', volume24hr: 9000 }),
    ]);
    const service = new MarketService(client, categories);

    const result = await service.getBoosted(10, 'Crypto');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('respects the limit', async () => {
    const many = Array.from({ length: 30 }, (_, i) => raw({ id: String(i), volume24hr: i }));
    const service = new MarketService(clientStub(many), categories);
    expect(await service.getBoosted(5)).toHaveLength(5);
  });
});

describe('MarketService.getMarket', () => {
  it('normalizes a found market', async () => {
    const service = new MarketService(clientStub([raw({ id: '42' })]), categories);
    const market = await service.getMarket('42');
    expect(market?.id).toBe('42');
    expect(market?.boost.boosted).toBe(true);
  });

  it('returns null for an unknown market', async () => {
    const service = new MarketService(clientStub([]), categories);
    expect(await service.getMarket('nope')).toBeNull();
  });
});

describe('MarketService.listCategories', () => {
  it('delegates to the category repository', () => {
    const service = new MarketService(clientStub([]), categories);
    expect(service.listCategories()).toContain('Sports');
  });
});
