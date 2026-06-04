/**
 * Data layer — domain types for observation spots.
 */
export interface Spot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export type NewSpot = Omit<Spot, 'id'>;
