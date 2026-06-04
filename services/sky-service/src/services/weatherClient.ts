import axios, { AxiosInstance } from 'axios';

/**
 * Service layer — port to an *external* weather provider.
 * The HTTP boundary here is what we exercise with web mocks (nock) in tests.
 */
export interface WeatherClient {
  /** Average cloud cover (%) for a coordinate on a given YYYY-MM-DD date. */
  getAverageCloudCover(latitude: number, longitude: number, date: string): Promise<number>;
}

/** Concrete adapter for the free Open-Meteo forecast API. */
export class OpenMeteoWeatherClient implements WeatherClient {
  constructor(
    private readonly baseUrl: string,
    private readonly http: AxiosInstance = axios.create({ timeout: 5000 }),
  ) {}

  async getAverageCloudCover(latitude: number, longitude: number, date: string): Promise<number> {
    const response = await this.http.get(`${this.baseUrl}/v1/forecast`, {
      params: {
        latitude,
        longitude,
        hourly: 'cloudcover',
        start_date: date,
        end_date: date,
      },
    });

    const values: number[] | undefined = response.data?.hourly?.cloudcover;
    if (!values || values.length === 0) {
      throw new Error('Weather provider returned no cloud cover data');
    }
    const sum = values.reduce((acc, value) => acc + value, 0);
    return Math.round(sum / values.length);
  }
}
