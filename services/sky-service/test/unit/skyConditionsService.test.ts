import { SkyConditionsService, rate } from '../../src/services/skyConditionsService';
import { LightPollutionRepository } from '../../src/data/lightPollutionRepository';
import { WeatherClient } from '../../src/services/weatherClient';

function repoStub(bortleClass: number, name = 'Test Site'): LightPollutionRepository {
  return {
    findNearest: () => ({ name, latitude: 0, longitude: 0, bortleClass }),
    all: () => [],
  };
}

function weatherStub(cloudCover: number): WeatherClient {
  return { getAverageCloudCover: jest.fn().mockResolvedValue(cloudCover) };
}

describe('rate', () => {
  it.each([
    [95, 'EXCELLENT'],
    [80, 'EXCELLENT'],
    [79, 'GOOD'],
    [60, 'GOOD'],
    [59, 'FAIR'],
    [40, 'FAIR'],
    [39, 'POOR'],
    [0, 'POOR'],
  ])('rates score %i as %s', (score, expected) => {
    expect(rate(score)).toBe(expected);
  });
});

describe('SkyConditionsService.assess', () => {
  it('gives a top score for a pristine, cloudless sky', async () => {
    const service = new SkyConditionsService(repoStub(1, 'Cévennes'), weatherStub(0));
    const result = await service.assess(44.25, 3.58, '2026-06-20');

    // lightScore = (9-1)/8*100 = 100, cloudScore = 100 -> 100
    expect(result.score).toBe(100);
    expect(result.rating).toBe('EXCELLENT');
    expect(result.recommended).toBe(true);
    expect(result.nearestSite).toBe('Cévennes');
    expect(result.bortleClass).toBe(1);
    expect(result.cloudCover).toBe(0);
  });

  it('gives a poor score for an inner-city overcast sky', async () => {
    const service = new SkyConditionsService(repoStub(9, 'Paris'), weatherStub(90));
    const result = await service.assess(48.86, 2.34, '2026-06-20');

    // lightScore = 0, cloudScore = 10 -> round(5) = 5
    expect(result.score).toBe(5);
    expect(result.rating).toBe('POOR');
    expect(result.recommended).toBe(false);
  });

  it('blends light and cloud scores at the recommendation boundary', async () => {
    // Bortle 3 -> lightScore 75 ; cloud 55 -> cloudScore 45 ; avg 60 -> GOOD
    const service = new SkyConditionsService(repoStub(3), weatherStub(55));
    const result = await service.assess(43.75, 6.92, '2026-06-20');
    expect(result.score).toBe(60);
    expect(result.recommended).toBe(true);
  });

  it('propagates weather provider failures', async () => {
    const failing: WeatherClient = {
      getAverageCloudCover: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const service = new SkyConditionsService(repoStub(2), failing);
    await expect(service.assess(0, 0, '2026-06-20')).rejects.toThrow('boom');
  });
});
