import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  it('falls back to defaults', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3001);
    expect(config.polyBaseUrl).toBe('http://localhost:3002');
    expect(config.databaseUrl).toBeUndefined();
  });

  it('reads overrides from the environment', () => {
    const config = loadConfig({
      PORT: '8080',
      POLY_BASE_URL: 'http://poly:3002',
      DATABASE_URL: 'postgres://u:p@db:5432/polypulse',
    });
    expect(config.port).toBe(8080);
    expect(config.polyBaseUrl).toBe('http://poly:3002');
    expect(config.databaseUrl).toBe('postgres://u:p@db:5432/polypulse');
  });
});
