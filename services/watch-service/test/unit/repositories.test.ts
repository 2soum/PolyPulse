import { InMemoryWatchRepository } from '../../src/data/watchRepository';
import { InMemorySnapshotRepository } from '../../src/data/snapshotRepository';

describe('InMemoryWatchRepository', () => {
  it('adds, gets, lists and deletes entries', async () => {
    const repo = new InMemoryWatchRepository();
    await repo.add({ marketId: 'm1', addedAt: '2026-06-01T00:00:00Z' });
    expect(await repo.get('m1')).toEqual({ marketId: 'm1', addedAt: '2026-06-01T00:00:00Z' });
    expect(await repo.list()).toHaveLength(1);
    expect(await repo.delete('m1')).toBe(true);
    expect(await repo.delete('m1')).toBe(false);
    expect(await repo.get('m1')).toBeNull();
  });

  it('accepts a seed list', async () => {
    const repo = new InMemoryWatchRepository([{ marketId: 's', addedAt: 't' }]);
    expect(await repo.get('s')).not.toBeNull();
  });
});

describe('InMemorySnapshotRepository', () => {
  it('appends snapshots and lists them oldest first', async () => {
    const repo = new InMemorySnapshotRepository();
    await repo.add({ marketId: 'm', ts: '2026-06-02T00:00:00Z', yesPrice: 0.5, volume24h: 10 });
    await repo.add({ marketId: 'm', ts: '2026-06-01T00:00:00Z', yesPrice: 0.4, volume24h: 5 });
    const list = await repo.list('m');
    expect(list.map((s) => s.yesPrice)).toEqual([0.4, 0.5]);
  });

  it('caps the result to the last N', async () => {
    const repo = new InMemorySnapshotRepository();
    for (let i = 0; i < 5; i++) {
      await repo.add({ marketId: 'm', ts: `2026-06-0${i + 1}T00:00:00Z`, yesPrice: i, volume24h: i });
    }
    const last2 = await repo.list('m', 2);
    expect(last2.map((s) => s.yesPrice)).toEqual([3, 4]);
  });

  it('deletes all snapshots for a market', async () => {
    const repo = new InMemorySnapshotRepository([
      { marketId: 'm', ts: 't', yesPrice: 1, volume24h: 1 },
    ]);
    await repo.deleteFor('m');
    expect(await repo.list('m')).toEqual([]);
  });

  it('returns [] for an unknown market', async () => {
    const repo = new InMemorySnapshotRepository();
    expect(await repo.list('nope')).toEqual([]);
  });
});
