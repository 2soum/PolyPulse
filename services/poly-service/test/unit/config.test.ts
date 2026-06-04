import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  it('falls back to defaults', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3002);
    expect(config.gammaBaseUrl).toBe('https://gamma-api.polymarket.com');
  });

  it('reads overrides from the environment', () => {
    const config = loadConfig({ PORT: '9100', GAMMA_BASE_URL: 'https://gamma.test' });
    expect(config.port).toBe(9100);
    expect(config.gammaBaseUrl).toBe('https://gamma.test');
  });
});
