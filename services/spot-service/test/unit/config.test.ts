import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  it('falls back to defaults', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3001);
    expect(config.skyBaseUrl).toBe('http://localhost:3002');
    expect(config.databaseUrl).toBeUndefined();
  });

  it('reads overrides from the environment', () => {
    const config = loadConfig({
      PORT: '8080',
      SKY_BASE_URL: 'http://sky:3002',
      DATABASE_URL: 'postgres://u:p@db:5432/astrospot',
    });
    expect(config.port).toBe(8080);
    expect(config.skyBaseUrl).toBe('http://sky:3002');
    expect(config.databaseUrl).toBe('postgres://u:p@db:5432/astrospot');
  });
});
