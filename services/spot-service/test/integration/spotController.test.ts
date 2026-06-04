import request from 'supertest';
import nock from 'nock';
import { createApp } from '../../src/app';
import { InMemorySpotRepository } from '../../src/data/spotRepository';
import { SkyClient } from '../../src/services/skyClient';
import { SpotService } from '../../src/services/spotService';

const SKY_BASE = 'http://sky.test';

function buildApp() {
  const repo = new InMemorySpotRepository();
  const sky = new SkyClient(SKY_BASE);
  const service = new SpotService(repo, sky);
  return createApp(service);
}

describe('spot-service HTTP API', () => {
  afterEach(() => nock.cleanAll());
  afterAll(() => nock.restore());

  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('spot-service');
  });

  it('answers CORS preflight (OPTIONS) with 204', async () => {
    const res = await request(buildApp()).options('/api/spots');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('creates, lists, fetches and deletes a spot', async () => {
    const app = buildApp();

    const created = await request(app)
      .post('/api/spots')
      .send({ name: 'Mont Aigoual', latitude: 44.12, longitude: 3.58 });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await request(app).get('/api/spots');
    expect(list.body).toHaveLength(1);

    const fetched = await request(app).get(`/api/spots/${id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.name).toBe('Mont Aigoual');

    const deleted = await request(app).delete(`/api/spots/${id}`);
    expect(deleted.status).toBe(204);

    const missing = await request(app).get(`/api/spots/${id}`);
    expect(missing.status).toBe(404);
  });

  it('rejects an invalid spot with 400', async () => {
    const res = await request(buildApp())
      .post('/api/spots')
      .send({ name: '', latitude: 999, longitude: 0 });
    expect(res.status).toBe(400);
  });

  it('plans a session by calling the (mocked) sky-service', async () => {
    const app = buildApp();
    const created = await request(app)
      .post('/api/spots')
      .send({ name: 'Cévennes', latitude: 44.25, longitude: 3.58 });
    const id = created.body.id;

    nock(SKY_BASE)
      .get('/api/sky/assess')
      .query({ latitude: '44.25', longitude: '3.58', date: '2026-06-20' })
      .reply(200, {
        latitude: 44.25,
        longitude: 3.58,
        date: '2026-06-20',
        nearestSite: 'Parc national des Cévennes',
        bortleClass: 2,
        cloudCover: 0,
        score: 94,
        rating: 'EXCELLENT',
        recommended: true,
      });

    const plan = await request(app).post(`/api/spots/${id}/plan`).send({ date: '2026-06-20' });

    expect(plan.status).toBe(200);
    expect(plan.body.recommended).toBe(true);
    expect(plan.body.assessment.rating).toBe('EXCELLENT');
    expect(plan.body.spot.name).toBe('Cévennes');
  });

  it('returns 502 when sky-service is unavailable during planning', async () => {
    const app = buildApp();
    const created = await request(app)
      .post('/api/spots')
      .send({ name: 'Cévennes', latitude: 44.25, longitude: 3.58 });

    nock(SKY_BASE).get('/api/sky/assess').query(true).reply(500);

    const plan = await request(app)
      .post(`/api/spots/${created.body.id}/plan`)
      .send({ date: '2026-06-20' });
    expect(plan.status).toBe(502);
  });

  it('returns 400 when planning with an invalid date', async () => {
    const app = buildApp();
    const created = await request(app)
      .post('/api/spots')
      .send({ name: 'Cévennes', latitude: 44.25, longitude: 3.58 });

    const plan = await request(app)
      .post(`/api/spots/${created.body.id}/plan`)
      .send({ date: 'nope' });
    expect(plan.status).toBe(400);
  });

  it('returns 404 when planning for an unknown spot', async () => {
    const plan = await request(buildApp())
      .post('/api/spots/unknown-id/plan')
      .send({ date: '2026-06-20' });
    expect(plan.status).toBe(404);
  });
});
