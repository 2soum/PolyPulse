import {
  InMemoryLightPollutionRepository,
  haversineKm,
  DEFAULT_CATALOG,
} from '../../src/data/lightPollutionRepository';

describe('haversineKm', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineKm(48.85, 2.35, 48.85, 2.35)).toBeCloseTo(0, 5);
  });

  it('computes a known distance (Paris -> Lyon ~ 392 km)', () => {
    const d = haversineKm(48.8566, 2.3522, 45.764, 4.8357);
    expect(d).toBeGreaterThan(380);
    expect(d).toBeLessThan(410);
  });
});

describe('InMemoryLightPollutionRepository', () => {
  const repo = new InMemoryLightPollutionRepository();

  it('exposes the full catalog as a defensive copy', () => {
    const all = repo.all();
    expect(all).toHaveLength(DEFAULT_CATALOG.length);
    all.pop();
    expect(repo.all()).toHaveLength(DEFAULT_CATALOG.length);
  });

  it('finds Paris as nearest to central Paris', () => {
    expect(repo.findNearest(48.86, 2.34).name).toBe('Paris');
  });

  it('finds the Cévennes as nearest to a rural point in the area', () => {
    expect(repo.findNearest(44.3, 3.6).name).toBe('Parc national des Cévennes');
  });

  it('throws when the catalog is empty', () => {
    const empty = new InMemoryLightPollutionRepository([]);
    expect(() => empty.findNearest(0, 0)).toThrow(/empty/);
  });
});
