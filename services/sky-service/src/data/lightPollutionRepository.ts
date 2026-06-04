import { LightPollutionEntry } from './types';

/**
 * Data layer — repository abstraction over the light-pollution catalog.
 * Swapping this for a database-backed implementation does not affect the
 * service or controller layers.
 */
export interface LightPollutionRepository {
  /** Returns the catalog entry geographically closest to the given point. */
  findNearest(latitude: number, longitude: number): LightPollutionEntry;
  /** Returns the full catalog (defensive copy). */
  all(): LightPollutionEntry[];
}

/** Seed catalog — approximate Bortle classes for a few French locations. */
export const DEFAULT_CATALOG: LightPollutionEntry[] = [
  { name: 'Parc national des Cévennes', latitude: 44.25, longitude: 3.58, bortleClass: 2 },
  { name: 'Pic du Midi de Bigorre', latitude: 42.937, longitude: 0.142, bortleClass: 2 },
  { name: 'Plateau de Calern', latitude: 43.75, longitude: 6.92, bortleClass: 3 },
  { name: 'Bordeaux', latitude: 44.8378, longitude: -0.5792, bortleClass: 7 },
  { name: 'Marseille', latitude: 43.2965, longitude: 5.3698, bortleClass: 8 },
  { name: 'Lyon', latitude: 45.764, longitude: 4.8357, bortleClass: 8 },
  { name: 'Paris', latitude: 48.8566, longitude: 2.3522, bortleClass: 9 },
];

/** Great-circle distance in kilometres between two coordinates. */
export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export class InMemoryLightPollutionRepository implements LightPollutionRepository {
  constructor(private readonly catalog: LightPollutionEntry[] = DEFAULT_CATALOG) {}

  all(): LightPollutionEntry[] {
    return [...this.catalog];
  }

  findNearest(latitude: number, longitude: number): LightPollutionEntry {
    if (this.catalog.length === 0) {
      throw new Error('Light pollution catalog is empty');
    }
    return this.catalog.reduce((best, entry) => {
      const dBest = haversineKm(latitude, longitude, best.latitude, best.longitude);
      const dEntry = haversineKm(latitude, longitude, entry.latitude, entry.longitude);
      return dEntry < dBest ? entry : best;
    });
  }
}
