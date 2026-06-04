import request from 'supertest';
import nock from 'nock';
import { createApp } from '../../src/app';
import { KeywordCategoryRepository } from '../../src/data/categoryRepository';
import { GammaPolymarketClient } from '../../src/services/polymarketClient';
import { MarketService } from '../../src/services/marketService';

const GAMMA = 'https://gamma.test';

function buildApp() {
  const client = new GammaPolymarketClient(GAMMA);
  const service = new MarketService(client, new KeywordCategoryRepository());
  return createApp(service);
}

const SAMPLE = [
  {
    id: '1',
    slug: 'aus-wc',
    question: 'Will Australia win the 2026 FIFA World Cup?',
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.0015","0.9985"]',
    volume24hr: 10000000,
    liquidityNum: 11000000,
    spread: 0.001,
    rewardsMinSize: 100,
    rewardsMaxSpread: 2.5,
    holdingRewardsEnabled: true,
  },
  {
    id: '2',
    question: 'Random non-boosted market',
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.5","0.5"]',
    volume24hr: 9000000,
    rewardsMinSize: 0,
    holdingRewardsEnabled: false,
  },
];

describe('poly-service HTTP API', () => {
  afterEach(() => nock.cleanAll());
  afterAll(() => nock.restore());

  it('GET /health', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('poly-service');
  });

  it('GET /api/markets/categories', async () => {
    const res = await request(buildApp()).get('/api/markets/categories');
    expect(res.status).toBe(200);
    expect(res.body).toContain('Sports');
  });

  it('GET /api/markets/boosted returns only boosted markets (Gamma mocked)', async () => {
    nock(GAMMA).get('/markets').query(true).reply(200, SAMPLE);
    const res = await request(buildApp()).get('/api/markets/boosted').query({ limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('1');
    expect(res.body[0].boost.score).toBe(90);
    expect(res.body[0].category).toBe('Sports');
  });

  it('GET /api/markets/boosted?category filters', async () => {
    nock(GAMMA).get('/markets').query(true).reply(200, SAMPLE);
    const res = await request(buildApp())
      .get('/api/markets/boosted')
      .query({ limit: 10, category: 'Crypto' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it.each([['0'], ['101'], ['abc']])('rejects invalid limit %s with 400', async (limit) => {
    const res = await request(buildApp()).get('/api/markets/boosted').query({ limit });
    expect(res.status).toBe(400);
  });

  it('returns 502 when Gamma is down', async () => {
    nock(GAMMA).get('/markets').query(true).reply(503);
    const res = await request(buildApp()).get('/api/markets/boosted').query({ limit: 5 });
    expect(res.status).toBe(502);
  });

  it('GET /api/markets/:id returns a market', async () => {
    nock(GAMMA).get('/markets/1').reply(200, SAMPLE[0]);
    const res = await request(buildApp()).get('/api/markets/1');
    expect(res.status).toBe(200);
    expect(res.body.question).toMatch(/Australia/);
  });

  it('GET /api/markets/:id returns 404 when missing', async () => {
    nock(GAMMA).get('/markets/999').reply(404, {});
    const res = await request(buildApp()).get('/api/markets/999');
    expect(res.status).toBe(404);
  });
});
