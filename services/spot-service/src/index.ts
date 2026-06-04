import { Pool } from 'pg';
import { loadConfig } from './config';
import { createApp } from './app';
import { SpotRepository, InMemorySpotRepository } from './data/spotRepository';
import { PostgresSpotRepository } from './data/postgresSpotRepository';
import { SkyClient } from './services/skyClient';
import { SpotService } from './services/spotService';

async function bootstrap(): Promise<void> {
  const config = loadConfig();

  let repository: SpotRepository;
  if (config.databaseUrl) {
    const pool = new Pool({ connectionString: config.databaseUrl });
    const pg = new PostgresSpotRepository(pool);
    await pg.init();
    repository = pg;
    // eslint-disable-next-line no-console
    console.log('spot-service using PostgreSQL repository');
  } else {
    repository = new InMemorySpotRepository();
    // eslint-disable-next-line no-console
    console.log('spot-service using in-memory repository');
  }

  const sky = new SkyClient(config.skyBaseUrl);
  const service = new SpotService(repository, sky);
  const app = createApp(service);

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`spot-service listening on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('failed to start spot-service', err);
  process.exit(1);
});
