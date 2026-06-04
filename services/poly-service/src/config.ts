export interface PolyConfig {
  port: number;
  gammaBaseUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PolyConfig {
  return {
    port: Number(env.PORT ?? 3002),
    gammaBaseUrl: env.GAMMA_BASE_URL ?? 'https://gamma-api.polymarket.com',
  };
}
