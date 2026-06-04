export interface SpotConfig {
  port: number;
  skyBaseUrl: string;
  databaseUrl?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SpotConfig {
  return {
    port: Number(env.PORT ?? 3001),
    skyBaseUrl: env.SKY_BASE_URL ?? 'http://localhost:3002',
    databaseUrl: env.DATABASE_URL,
  };
}
