import nock from 'nock';
import { GammaPolymarketClient } from '../../src/services/polymarketClient';

const BASE = 'https://gamma.test';

describe('GammaPolymarketClient (web mock)', () => {
  afterEach(() => nock.cleanAll());
  afterAll(() => nock.restore());

  it('fetches markets with the expected query and returns the array', async () => {
    const scope = nock(BASE)
      .get('/markets')
      .query({ active: 'true', closed: 'false', order: 'volume24hr', ascending: 'false', limit: '5' })
      .reply(200, [{ id: '1' }, { id: '2' }]);

    const client = new GammaPolymarketClient(BASE);
    const markets = await client.fetchMarkets(5);
    expect(markets).toHaveLength(2);
    expect(scope.isDone()).toBe(true);
  });

  it('unwraps a { data: [...] } envelope', async () => {
    nock(BASE).get('/markets').query(true).reply(200, { data: [{ id: '9' }] });
    const client = new GammaPolymarketClient(BASE);
    expect(await client.fetchMarkets(1)).toEqual([{ id: '9' }]);
  });

  it('returns [] for unexpected payloads', async () => {
    nock(BASE).get('/markets').query(true).reply(200, { weird: true });
    const client = new GammaPolymarketClient(BASE);
    expect(await client.fetchMarkets(1)).toEqual([]);
  });

  it('fetches a single market by id', async () => {
    nock(BASE).get('/markets/42').reply(200, { id: '42', question: 'Q' });
    const client = new GammaPolymarketClient(BASE);
    const market = await client.fetchMarket('42');
    expect(market?.id).toBe('42');
  });

  it('returns null when a market is not found (404)', async () => {
    nock(BASE).get('/markets/999').reply(404, { error: 'nope' });
    const client = new GammaPolymarketClient(BASE);
    expect(await client.fetchMarket('999')).toBeNull();
  });

  it('propagates upstream 5xx errors', async () => {
    nock(BASE).get('/markets').query(true).reply(500);
    const client = new GammaPolymarketClient(BASE);
    await expect(client.fetchMarkets(1)).rejects.toThrow();
  });
});
