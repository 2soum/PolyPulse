import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  it('falls back to default port and weather URL', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3002);
    expect(config.weatherBaseUrl).toBe('https://api.open-meteo.com');
  });

  it('reads overrides from the environment', () => {
    const config = loadConfig({ PORT: '9000', WEATHER_BASE_URL: 'https://example.test' });
    expect(config.port).toBe(9000);
    expect(config.weatherBaseUrl).toBe('https://example.test');
  });
});
