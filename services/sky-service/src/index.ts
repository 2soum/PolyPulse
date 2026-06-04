import { loadConfig } from './config';
import { createApp } from './app';
import { InMemoryLightPollutionRepository } from './data/lightPollutionRepository';
import { OpenMeteoWeatherClient } from './services/weatherClient';
import { SkyConditionsService } from './services/skyConditionsService';

const config = loadConfig();
const repository = new InMemoryLightPollutionRepository();
const weather = new OpenMeteoWeatherClient(config.weatherBaseUrl);
const service = new SkyConditionsService(repository, weather);
const app = createApp(service);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`sky-service listening on port ${config.port}`);
});
