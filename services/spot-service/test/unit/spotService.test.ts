import { SpotService } from '../../src/services/spotService';
import { InMemorySpotRepository } from '../../src/data/spotRepository';
import { SkyGateway, SkyAssessment } from '../../src/services/skyClient';
import { NotFoundError, ValidationError } from '../../src/errors';

function assessment(overrides: Partial<SkyAssessment> = {}): SkyAssessment {
  return {
    latitude: 44.25,
    longitude: 3.58,
    date: '2026-06-20',
    nearestSite: 'Cévennes',
    bortleClass: 2,
    cloudCover: 0,
    score: 94,
    rating: 'EXCELLENT',
    recommended: true,
    ...overrides,
  };
}

function skyStub(result: SkyAssessment): SkyGateway {
  return { assess: jest.fn().mockResolvedValue(result) };
}

describe('SpotService', () => {
  it('creates a valid spot and trims fields', async () => {
    const repo = new InMemorySpotRepository();
    const service = new SpotService(repo, skyStub(assessment()));

    const spot = await service.create({
      name: '  Mont Aigoual  ',
      latitude: 44.12,
      longitude: 3.58,
      description: '  summit  ',
    });

    expect(spot.name).toBe('Mont Aigoual');
    expect(spot.description).toBe('summit');
    expect(await repo.list()).toHaveLength(1);
  });

  it.each([
    ['blank name', { name: '   ', latitude: 1, longitude: 2 }],
    ['latitude out of range', { name: 'x', latitude: 91, longitude: 2 }],
    ['longitude out of range', { name: 'x', latitude: 1, longitude: 181 }],
  ])('rejects %s with ValidationError', async (_label, input) => {
    const service = new SpotService(new InMemorySpotRepository(), skyStub(assessment()));
    await expect(service.create(input)).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws NotFoundError when getting an unknown spot', async () => {
    const service = new SpotService(new InMemorySpotRepository(), skyStub(assessment()));
    await expect(service.get('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('removes an existing spot and rejects unknown ids', async () => {
    const repo = new InMemorySpotRepository();
    const service = new SpotService(repo, skyStub(assessment()));
    const spot = await service.create({ name: 'A', latitude: 1, longitude: 2 });

    await expect(service.remove(spot.id)).resolves.toBeUndefined();
    await expect(service.remove(spot.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  describe('planSession', () => {
    it('asks sky-service to score the spot and returns the plan', async () => {
      const repo = new InMemorySpotRepository();
      const sky = skyStub(assessment({ score: 94, recommended: true }));
      const service = new SpotService(repo, sky);
      const spot = await service.create({ name: 'Cévennes', latitude: 44.25, longitude: 3.58 });

      const plan = await service.planSession(spot.id, '2026-06-20');

      expect(sky.assess).toHaveBeenCalledWith(44.25, 3.58, '2026-06-20');
      expect(plan.spot.id).toBe(spot.id);
      expect(plan.assessment.score).toBe(94);
      expect(plan.recommended).toBe(true);
    });

    it('rejects an invalid date before calling sky-service', async () => {
      const sky = skyStub(assessment());
      const service = new SpotService(new InMemorySpotRepository(), sky);
      await expect(service.planSession('whatever', 'bad-date')).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(sky.assess).not.toHaveBeenCalled();
    });

    it('propagates NotFoundError for an unknown spot', async () => {
      const service = new SpotService(new InMemorySpotRepository(), skyStub(assessment()));
      await expect(service.planSession('nope', '2026-06-20')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
