import nock from 'nock';
import { PolyClient } from '../../src/services/polyGateway';

const BASE = 'http://poly.test';

describe('PolyClient (inter-service web mock)', () => {
  afterEach(() => nock.cleanAll());
  afterAll(() => nock.restore());

  it('getBoosted forwards limit and category', async () => {
    const scope = nock(BASE)
      .get('/api/markets/boosted')
      .query({ limit: '8', category: 'Crypto' })
      .reply(200, [{ id: '1' }]);
    const client = new PolyClient(BASE);
    const markets = await client.getBoosted(8, 'Crypto');
    expect(markets).toHaveLength(1);
    expect(scope.isDone()).toBe(true);
  });

  it('getBoosted omits category when not provided', async () => {
    nock(BASE).get('/api/markets/boosted').query({ limit: '5' }).reply(200, []);
    const client = new PolyClient(BASE);
    expect(await client.getBoosted(5)).toEqual([]);
  });

  it('getMarket returns the market', async () => {
    nock(BASE).get('/api/markets/42').reply(200, { id: '42' });
    const client = new PolyClient(BASE);
    expect((await client.getMarket('42'))?.id).toBe('42');
  });

  it('getMarket returns null on 404', async () => {
    nock(BASE).get('/api/markets/999').reply(404, { error: 'nope' });
    const client = new PolyClient(BASE);
    expect(await client.getMarket('999')).toBeNull();
  });

  it('getCategories returns the list', async () => {
    nock(BASE).get('/api/markets/categories').reply(200, ['Crypto', 'Sports']);
    const client = new PolyClient(BASE);
    expect(await client.getCategories()).toContain('Sports');
  });

  it('propagates upstream errors', async () => {
    nock(BASE).get('/api/markets/boosted').query(true).reply(502);
    const client = new PolyClient(BASE);
    await expect(client.getBoosted(5)).rejects.toThrow();
  });
});
