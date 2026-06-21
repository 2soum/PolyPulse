import axios, { AxiosInstance } from 'axios';

/** Raw market object as returned by the Polymarket Gamma API. */
export type RawMarket = Record<string, unknown>;

/**
 * Service layer — port to the *external* Polymarket Gamma API.
 * This HTTP boundary is exercised with web mocks (nock) in tests.
 */
export interface PolymarketClient {
  fetchMarkets(limit: number): Promise<RawMarket[]>;
  fetchMarket(id: string): Promise<RawMarket | null>;
}

export class GammaPolymarketClient implements PolymarketClient {
  constructor(
    private readonly baseUrl: string,
    private readonly http: AxiosInstance = axios.create({ timeout: 8000 }),
  ) {}

  async fetchMarkets(limit: number): Promise<RawMarket[]> {
    const response = await this.http.get(`${this.baseUrl}/markets`, {
      params: {
        active: true,
        closed: false,
        order: 'volume24hr',
        ascending: false,
        limit,
      },
    });
    const data = response.data;
    if (Array.isArray(data)) return data as RawMarket[];
    if (data && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: RawMarket[] }).data;
    }
    return [];
  }

  async fetchMarket(id: string): Promise<RawMarket | null> {
    // Sécurité (SonarQube tssecurity:S7044) : l'id provient du client → liste blanche
    // stricte avant insertion dans le chemin de l'URL (anti-injection de chemin / SSRF).
    if (!/^[\w-]{1,128}$/.test(id)) return null;
    const response = await this.http.get(`${this.baseUrl}/markets/${encodeURIComponent(id)}`, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });
    if (response.status === 404 || !response.data) return null;
    return response.data as RawMarket;
  }
}
