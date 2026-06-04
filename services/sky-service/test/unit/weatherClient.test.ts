import nock from 'nock';
import { OpenMeteoWeatherClient } from '../../src/services/weatherClient';

const BASE = 'https://weather.test';

describe('OpenMeteoWeatherClient (web mock)', () => {
  afterEach(() => nock.cleanAll());
  afterAll(() => nock.restore());

  it('averages the hourly cloud cover returned by the provider', async () => {
    nock(BASE)
      .get('/v1/forecast')
      .query(true)
      .reply(200, { hourly: { cloudcover: [0, 50, 100, 50] } });

    const client = new OpenMeteoWeatherClient(BASE);
    const avg = await client.getAverageCloudCover(44.25, 3.58, '2026-06-20');
    expect(avg).toBe(50);
  });

  it('sends the expected query parameters', async () => {
    const scope = nock(BASE)
      .get('/v1/forecast')
      .query({
        latitude: '48.85',
        longitude: '2.35',
        hourly: 'cloudcover',
        start_date: '2026-06-20',
        end_date: '2026-06-20',
      })
      .reply(200, { hourly: { cloudcover: [10, 30] } });

    const client = new OpenMeteoWeatherClient(BASE);
    const avg = await client.getAverageCloudCover(48.85, 2.35, '2026-06-20');
    expect(avg).toBe(20);
    expect(scope.isDone()).toBe(true);
  });

  it('throws when the provider returns no data', async () => {
    nock(BASE).get('/v1/forecast').query(true).reply(200, { hourly: { cloudcover: [] } });
    const client = new OpenMeteoWeatherClient(BASE);
    await expect(client.getAverageCloudCover(0, 0, '2026-06-20')).rejects.toThrow(/no cloud cover/);
  });

  it('propagates HTTP errors from the provider', async () => {
    nock(BASE).get('/v1/forecast').query(true).reply(500);
    const client = new OpenMeteoWeatherClient(BASE);
    await expect(client.getAverageCloudCover(0, 0, '2026-06-20')).rejects.toThrow();
  });
});
