import request from 'supertest';
import nock from 'nock';
import { createApp } from '../../src/app';
import { InMemoryLightPollutionRepository } from '../../src/data/lightPollutionRepository';
import { OpenMeteoWeatherClient } from '../../src/services/weatherClient';
import { SkyConditionsService } from '../../src/services/skyConditionsService';

const WEATHER_BASE = 'https://weather.test';

function buildApp() {
  const repo = new InMemoryLightPollutionRepository();
  const weather = new OpenMeteoWeatherClient(WEATHER_BASE);
  const service = new SkyConditionsService(repo, weather);
  return createApp(service);
}

describe('sky-service HTTP API', () => {
  afterEach(() => nock.cleanAll());
  afterAll(() => nock.restore());

  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'sky-service' });
  });

  it('GET /api/sky/assess returns an assessment (external weather mocked)', async () => {
    nock(WEATHER_BASE)
      .get('/v1/forecast')
      .query(true)
      .reply(200, { hourly: { cloudcover: [0, 0, 0] } });

    const res = await request(buildApp())
      .get('/api/sky/assess')
      .query({ latitude: 44.25, longitude: 3.58, date: '2026-06-20' });

    expect(res.status).toBe(200);
    expect(res.body.nearestSite).toBe('Parc national des Cévennes');
    // Bortle 2 -> lightScore 87.5, cloud 0 -> cloudScore 100, avg -> 94
    expect(res.body.score).toBe(94);
    expect(res.body.rating).toBe('EXCELLENT');
    expect(res.body.recommended).toBe(true);
  });

  it.each([
    ['latitude', { latitude: 200, longitude: 2, date: '2026-06-20' }],
    ['longitude', { latitude: 44, longitude: 999, date: '2026-06-20' }],
    ['date', { latitude: 44, longitude: 2, date: 'not-a-date' }],
  ])('rejects invalid %s with 400', async (_field, query) => {
    const res = await request(buildApp()).get('/api/sky/assess').query(query);
    expect(res.status).toBe(400);
  });

  it('returns 502 when the weather provider fails', async () => {
    nock(WEATHER_BASE).get('/v1/forecast').query(true).reply(503);
    const res = await request(buildApp())
      .get('/api/sky/assess')
      .query({ latitude: 44.25, longitude: 3.58, date: '2026-06-20' });
    expect(res.status).toBe(502);
  });
});
