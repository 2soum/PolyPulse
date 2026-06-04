import nock from 'nock';
import { SkyClient } from '../../src/services/skyClient';

const SKY_BASE = 'http://sky.test';

describe('SkyClient (inter-service web mock)', () => {
  afterEach(() => nock.cleanAll());
  afterAll(() => nock.restore());

  it('calls sky-service /api/sky/assess with the right params', async () => {
    const scope = nock(SKY_BASE)
      .get('/api/sky/assess')
      .query({ latitude: '44.25', longitude: '3.58', date: '2026-06-20' })
      .reply(200, {
        latitude: 44.25,
        longitude: 3.58,
        date: '2026-06-20',
        nearestSite: 'Cévennes',
        bortleClass: 2,
        cloudCover: 0,
        score: 94,
        rating: 'EXCELLENT',
        recommended: true,
      });

    const client = new SkyClient(SKY_BASE);
    const result = await client.assess(44.25, 3.58, '2026-06-20');

    expect(result.score).toBe(94);
    expect(result.recommended).toBe(true);
    expect(scope.isDone()).toBe(true);
  });

  it('propagates errors from sky-service', async () => {
    nock(SKY_BASE).get('/api/sky/assess').query(true).reply(502);
    const client = new SkyClient(SKY_BASE);
    await expect(client.assess(0, 0, '2026-06-20')).rejects.toThrow();
  });
});
