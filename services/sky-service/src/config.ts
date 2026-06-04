export interface SkyConfig {
  port: number;
  weatherBaseUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SkyConfig {
  return {
    port: Number(env.PORT ?? 3002),
    weatherBaseUrl: env.WEATHER_BASE_URL ?? 'https://api.open-meteo.com',
  };
}
