import axios, { AxiosInstance } from 'axios';

export interface BoostInfo {
  boosted: boolean;
  score: number;
  minSize: number;
  maxSpread: number;
  holdingRewards: boolean;
}

/** Normalized market as returned by poly-service. */
export interface Market {
  id: string;
  slug: string;
  question: string;
  category: string;
  icon?: string;
  outcomes: string[];
  prices: number[];
  yesPrice: number | null;
  volume24h: number;
  liquidity: number;
  spread: number;
  oneDayChange: number | null;
  oneWeekChange: number | null;
  endDate?: string;
  boost: BoostInfo;
}

/**
 * Service layer — HTTP client for the companion poly-service.
 * This inter-service boundary is mocked (nock) in tests.
 */
export interface PolyGateway {
  getBoosted(limit: number, category?: string): Promise<Market[]>;
  getMarket(id: string): Promise<Market | null>;
  getCategories(): Promise<string[]>;
}

export class PolyClient implements PolyGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly http: AxiosInstance = axios.create({ timeout: 8000 }),
  ) {}

  async getBoosted(limit: number, category?: string): Promise<Market[]> {
    const response = await this.http.get<Market[]>(`${this.baseUrl}/api/markets/boosted`, {
      params: { limit, ...(category ? { category } : {}) },
    });
    return response.data;
  }

  async getMarket(id: string): Promise<Market | null> {
    const response = await this.http.get<Market>(`${this.baseUrl}/api/markets/${id}`, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });
    return response.status === 404 ? null : response.data;
  }

  async getCategories(): Promise<string[]> {
    const response = await this.http.get<string[]>(`${this.baseUrl}/api/markets/categories`);
    return response.data;
  }
}
