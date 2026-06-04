import { Pool } from 'pg';
import { WatchedMarket, Snapshot } from './types';
import { WatchRepository } from './watchRepository';
import { SnapshotRepository } from './snapshotRepository';

/**
 * Data layer — PostgreSQL implementations (bonus: database). Exercised through
 * docker-compose, hence excluded from the unit-coverage target.
 */
export class PostgresWatchRepository implements WatchRepository {
  constructor(private readonly pool: Pool) {}

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS watched_markets (
        market_id TEXT PRIMARY KEY,
        added_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id        BIGSERIAL PRIMARY KEY,
        market_id TEXT NOT NULL,
        ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
        yes_price DOUBLE PRECISION,
        volume24h DOUBLE PRECISION NOT NULL
      )
    `);
    await this.pool.query(
      'CREATE INDEX IF NOT EXISTS idx_snapshots_market_ts ON snapshots (market_id, ts)',
    );
  }

  async list(): Promise<WatchedMarket[]> {
    const { rows } = await this.pool.query('SELECT * FROM watched_markets ORDER BY added_at');
    return rows.map((r) => ({ marketId: r.market_id, addedAt: new Date(r.added_at).toISOString() }));
  }

  async get(marketId: string): Promise<WatchedMarket | null> {
    const { rows } = await this.pool.query('SELECT * FROM watched_markets WHERE market_id = $1', [
      marketId,
    ]);
    return rows[0]
      ? { marketId: rows[0].market_id, addedAt: new Date(rows[0].added_at).toISOString() }
      : null;
  }

  async add(entry: WatchedMarket): Promise<WatchedMarket> {
    await this.pool.query(
      `INSERT INTO watched_markets (market_id, added_at) VALUES ($1, $2)
       ON CONFLICT (market_id) DO NOTHING`,
      [entry.marketId, entry.addedAt],
    );
    return entry;
  }

  async delete(marketId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM watched_markets WHERE market_id = $1', [
      marketId,
    ]);
    await this.pool.query('DELETE FROM snapshots WHERE market_id = $1', [marketId]);
    return (rowCount ?? 0) > 0;
  }
}

export class PostgresSnapshotRepository implements SnapshotRepository {
  constructor(private readonly pool: Pool) {}

  async add(snapshot: Snapshot): Promise<Snapshot> {
    await this.pool.query(
      'INSERT INTO snapshots (market_id, ts, yes_price, volume24h) VALUES ($1, $2, $3, $4)',
      [snapshot.marketId, snapshot.ts, snapshot.yesPrice, snapshot.volume24h],
    );
    return snapshot;
  }

  async list(marketId: string, limit?: number): Promise<Snapshot[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM (
         SELECT * FROM snapshots WHERE market_id = $1 ORDER BY ts DESC LIMIT $2
       ) s ORDER BY ts ASC`,
      [marketId, limit ?? 200],
    );
    return rows.map((r) => ({
      marketId: r.market_id,
      ts: new Date(r.ts).toISOString(),
      yesPrice: r.yes_price,
      volume24h: r.volume24h,
    }));
  }

  async deleteFor(marketId: string): Promise<void> {
    await this.pool.query('DELETE FROM snapshots WHERE market_id = $1', [marketId]);
  }
}
