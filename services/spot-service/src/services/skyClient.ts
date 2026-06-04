import axios, { AxiosInstance } from 'axios';

/** Shape returned by the sky-service `/api/sky/assess` endpoint. */
export interface SkyAssessment {
  latitude: number;
  longitude: number;
  date: string;
  nearestSite: string;
  bortleClass: number;
  cloudCover: number;
  score: number;
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  recommended: boolean;
}

/**
 * Service layer — HTTP client for the companion sky-service.
 * This inter-service boundary is mocked (nock) in spot-service tests.
 */
export interface SkyGateway {
  assess(latitude: number, longitude: number, date: string): Promise<SkyAssessment>;
}

export class SkyClient implements SkyGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly http: AxiosInstance = axios.create({ timeout: 5000 }),
  ) {}

  async assess(latitude: number, longitude: number, date: string): Promise<SkyAssessment> {
    const response = await this.http.get<SkyAssessment>(`${this.baseUrl}/api/sky/assess`, {
      params: { latitude, longitude, date },
    });
    return response.data;
  }
}
