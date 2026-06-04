import { loadConfig } from './config';
import { createApp } from './app';
import { KeywordCategoryRepository } from './data/categoryRepository';
import { GammaPolymarketClient } from './services/polymarketClient';
import { MarketService } from './services/marketService';

const config = loadConfig();
const client = new GammaPolymarketClient(config.gammaBaseUrl);
const categories = new KeywordCategoryRepository();
const service = new MarketService(client, categories);
const app = createApp(service);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`poly-service listening on port ${config.port}`);
});
