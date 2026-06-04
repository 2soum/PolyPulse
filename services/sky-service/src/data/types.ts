/**
 * Data layer — domain types for the light-pollution catalog.
 */
export interface LightPollutionEntry {
  /** Human-readable site name. */
  name: string;
  latitude: number;
  longitude: number;
  /**
   * Bortle dark-sky class.
   * 1 = pristine sky (excellent), 9 = inner-city sky (no stars).
   */
  bortleClass: number;
}
