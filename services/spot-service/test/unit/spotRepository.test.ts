import { InMemorySpotRepository } from '../../src/data/spotRepository';

describe('InMemorySpotRepository', () => {
  it('creates a spot and assigns an id', async () => {
    const repo = new InMemorySpotRepository();
    const spot = await repo.create({ name: 'Test', latitude: 1, longitude: 2 });
    expect(spot.id).toBeTruthy();
    expect(spot.name).toBe('Test');
  });

  it('lists created spots', async () => {
    const repo = new InMemorySpotRepository();
    await repo.create({ name: 'A', latitude: 1, longitude: 2 });
    await repo.create({ name: 'B', latitude: 3, longitude: 4 });
    expect(await repo.list()).toHaveLength(2);
  });

  it('gets a spot by id and returns null when missing', async () => {
    const repo = new InMemorySpotRepository();
    const created = await repo.create({ name: 'A', latitude: 1, longitude: 2 });
    expect(await repo.get(created.id)).toEqual(created);
    expect(await repo.get('does-not-exist')).toBeNull();
  });

  it('deletes a spot and reports whether it existed', async () => {
    const repo = new InMemorySpotRepository();
    const created = await repo.create({ name: 'A', latitude: 1, longitude: 2 });
    expect(await repo.delete(created.id)).toBe(true);
    expect(await repo.delete(created.id)).toBe(false);
    expect(await repo.list()).toHaveLength(0);
  });

  it('accepts a seed list', async () => {
    const repo = new InMemorySpotRepository([
      { id: 'seed-1', name: 'Seeded', latitude: 0, longitude: 0 },
    ]);
    expect(await repo.get('seed-1')).toEqual({
      id: 'seed-1',
      name: 'Seeded',
      latitude: 0,
      longitude: 0,
    });
  });
});
