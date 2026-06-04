import { randomUUID } from 'crypto';
import { Spot, NewSpot } from './types';

/**
 * Data layer — repository abstraction. The service layer depends only on this
 * interface, so the in-memory and PostgreSQL implementations are interchangeable.
 */
export interface SpotRepository {
  list(): Promise<Spot[]>;
  get(id: string): Promise<Spot | null>;
  create(spot: NewSpot): Promise<Spot>;
  delete(id: string): Promise<boolean>;
}

export class InMemorySpotRepository implements SpotRepository {
  private readonly store = new Map<string, Spot>();

  constructor(seed: Spot[] = []) {
    for (const spot of seed) {
      this.store.set(spot.id, spot);
    }
  }

  async list(): Promise<Spot[]> {
    return [...this.store.values()];
  }

  async get(id: string): Promise<Spot | null> {
    return this.store.get(id) ?? null;
  }

  async create(spot: NewSpot): Promise<Spot> {
    const created: Spot = { id: randomUUID(), ...spot };
    this.store.set(created.id, created);
    return created;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
