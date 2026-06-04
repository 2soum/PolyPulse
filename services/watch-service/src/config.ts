export interface WatchConfig {
  port: number;
  polyBaseUrl: string;
  databaseUrl?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WatchConfig {
  return {
    port: Number(env.PORT ?? 3001),
    polyBaseUrl: env.POLY_BASE_URL ?? 'http://localhost:3002',
    databaseUrl: env.DATABASE_URL,
  };
}
