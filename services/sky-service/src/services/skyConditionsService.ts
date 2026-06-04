import { LightPollutionRepository } from '../data/lightPollutionRepository';
import { WeatherClient } from './weatherClient';

export type Rating = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export interface SkyAssessment {
  latitude: number;
  longitude: number;
  date: string;
  nearestSite: string;
  bortleClass: number;
  cloudCover: number;
  /** 0 (unusable) .. 100 (perfect). */
  score: number;
  rating: Rating;
  recommended: boolean;
}

/**
 * Service layer — combines light-pollution data (Data layer) and live weather
 * (external provider) into a single stargazing-quality score.
 */
export class SkyConditionsService {
  constructor(
    private readonly lightPollution: LightPollutionRepository,
    private readonly weather: WeatherClient,
  ) {}

  async assess(latitude: number, longitude: number, date: string): Promise<SkyAssessment> {
    const site = this.lightPollution.findNearest(latitude, longitude);
    const cloudCover = await this.weather.getAverageCloudCover(latitude, longitude, date);

    // Bortle 1 -> 100, Bortle 9 -> 0.
    const lightScore = ((9 - site.bortleClass) / 8) * 100;
    const cloudScore = 100 - cloudCover;
    const score = Math.max(0, Math.min(100, Math.round(0.5 * lightScore + 0.5 * cloudScore)));

    return {
      latitude,
      longitude,
      date,
      nearestSite: site.name,
      bortleClass: site.bortleClass,
      cloudCover,
      score,
      rating: rate(score),
      recommended: score >= 60,
    };
  }
}

export function rate(score: number): Rating {
  if (score >= 80) return 'EXCELLENT';
  if (score >= 60) return 'GOOD';
  if (score >= 40) return 'FAIR';
  return 'POOR';
}
