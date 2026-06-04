import { Pool } from 'pg';
import { loadConfig } from './config';
import { createApp } from './app';
import { WatchRepository, InMemoryWatchRepository } from './data/watchRepository';
import { SnapshotRepository, InMemorySnapshotRepository } from './data/snapshotRepository';
import { PostgresWatchRepository, PostgresSnapshotRepository } from './data/postgresRepositories';
import { PolyClient } from './services/polyGateway';
import { WatchService } from './services/watchService';

async function bootstrap(): Promise<void> {
  const config = loadConfig();

  let watch: WatchRepository;
  let snapshots: SnapshotRepository;

  if (config.databaseUrl) {
    const pool = new Pool({ connectionString: config.databaseUrl });
    const pgWatch = new PostgresWatchRepository(pool);
    await pgWatch.init();
    watch = pgWatch;
    snapshots = new PostgresSnapshotRepository(pool);
    // eslint-disable-next-line no-console
    console.log('watch-service using PostgreSQL repositories');
  } else {
    watch = new InMemoryWatchRepository();
    snapshots = new InMemorySnapshotRepository();
    // eslint-disable-next-line no-console
    console.log('watch-service using in-memory repositories');
  }

  const poly = new PolyClient(config.polyBaseUrl);
  const service = new WatchService(watch, snapshots, poly);
  const app = createApp(service);

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`watch-service listening on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('failed to start watch-service', err);
  process.exit(1);
});
