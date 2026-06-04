import { Pool } from 'pg';
import { Spot, NewSpot } from './types';
import { SpotRepository } from './spotRepository';

/**
 * Data layer — PostgreSQL-backed implementation (bonus: database).
 *
 * Exercised through docker-compose (`make integration`) rather than unit tests,
 * which is why it is excluded from the unit-coverage target.
 */
export class PostgresSpotRepository implements SpotRepository {
  constructor(private readonly pool: Pool) {}

  /** Creates the table if it does not exist. Called once at startup. */
  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS spots (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        latitude    DOUBLE PRECISION NOT NULL,
        longitude   DOUBLE PRECISION NOT NULL,
        description TEXT
      )
    `);
  }

  async list(): Promise<Spot[]> {
    const { rows } = await this.pool.query('SELECT * FROM spots ORDER BY name');
    return rows.map(toSpot);
  }

  async get(id: string): Promise<Spot | null> {
    const { rows } = await this.pool.query('SELECT * FROM spots WHERE id = $1', [id]);
    return rows[0] ? toSpot(rows[0]) : null;
  }

  async create(spot: NewSpot): Promise<Spot> {
    const { rows } = await this.pool.query(
      `INSERT INTO spots (name, latitude, longitude, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [spot.name, spot.latitude, spot.longitude, spot.description ?? null],
    );
    return toSpot(rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM spots WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }
}

function toSpot(row: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string | null;
}): Spot {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.description ?? undefined,
  };
}
