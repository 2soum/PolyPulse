import request from 'supertest';
import nock from 'nock';
import { createApp } from '../../src/app';
import { InMemoryWatchRepository } from '../../src/data/watchRepository';
import { InMemorySnapshotRepository } from '../../src/data/snapshotRepository';
import { PolyClient } from '../../src/services/polyGateway';
import { WatchService } from '../../src/services/watchService';

const POLY = 'http://poly.test';

const MARKET = {
  id: '1',
  slug: 'aus',
  question: 'Will Australia win the 2026 FIFA World Cup?',
  category: 'Sports',
  outcomes: ['Yes', 'No'],
  prices: [0.0015, 0.9985],
  yesPrice: 0.0015,
  volume24h: 10000000,
  liquidity: 11000000,
  spread: 0.001,
  oneDayChange: 0.03,
  oneWeekChange: null,
  boost: { boosted: true, score: 90, minSize: 100, maxSpread: 2.5, holdingRewards: true },
};

function buildApp() {
  const service = new WatchService(
    new InMemoryWatchRepository(),
    new InMemorySnapshotRepository(),
    new PolyClient(POLY),
  );
  return createApp(service);
}

describe('watch-service HTTP API', () => {
  afterEach(() => nock.cleanAll());
  afterAll(() => nock.restore());

  it('GET /health', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('watch-service');
  });

  it('answers CORS preflight with 204', async () => {
    const res = await request(buildApp()).options('/api/dashboard');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('GET /api/discover proxies poly-service (mocked)', async () => {
    nock(POLY).get('/api/markets/boosted').query({ limit: '12' }).reply(200, [MARKET]);
    const res = await request(buildApp()).get('/api/discover');
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe('1');
  });

  it('rejects an invalid discover limit', async () => {
    const res = await request(buildApp()).get('/api/discover').query({ limit: 0 });
    expect(res.status).toBe(400);
  });

  it('GET /api/categories proxies poly-service', async () => {
    nock(POLY).get('/api/markets/categories').reply(200, ['Sports', 'Crypto']);
    const res = await request(buildApp()).get('/api/categories');
    expect(res.body).toContain('Sports');
  });

  it('full flow: add a market then read the dashboard', async () => {
    const app = buildApp();

    nock(POLY).get('/api/markets/1').reply(200, MARKET);
    const added = await request(app).post('/api/watchlist').send({ marketId: '1' });
    expect(added.status).toBe(201);

    nock(POLY).get('/api/markets/1').reply(200, MARKET);
    const dash = await request(app).get('/api/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.body.kpis.watched).toBe(1);
    expect(dash.body.kpis.totalVolume24h).toBe(10000000);
    expect(dash.body.rows[0].market.question).toMatch(/Australia/);
    expect(dash.body.rows[0].sparkline.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 404 when adding an unknown market', async () => {
    nock(POLY).get('/api/markets/999').reply(404, {});
    const res = await request(buildApp()).post('/api/watchlist').send({ marketId: '999' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when adding without a marketId', async () => {
    const res = await request(buildApp()).post('/api/watchlist').send({});
    expect(res.status).toBe(400);
  });

  it('deletes a watched market', async () => {
    const app = buildApp();
    nock(POLY).get('/api/markets/1').reply(200, MARKET);
    await request(app).post('/api/watchlist').send({ marketId: '1' });
    const del = await request(app).delete('/api/watchlist/1');
    expect(del.status).toBe(204);
  });

  it('returns 502 when poly-service is down during discover', async () => {
    nock(POLY).get('/api/markets/boosted').query(true).reply(503);
    const res = await request(buildApp()).get('/api/discover');
    expect(res.status).toBe(502);
  });
});
