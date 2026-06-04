import express, { Express, Request, Response } from 'express';
import { createWatchRouter } from './controller/watchController';
import { WatchService } from './services/watchService';

/** Builds the Express application (side-effect free for testability). */
export function createApp(service: WatchService): Express {
  const app = express();
  app.use(express.json());

  // Permissive CORS so the static dashboard (other origin) can call us.
  app.use((req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/health', (_req: Request, res: Response) =>
    res.json({ status: 'ok', service: 'watch-service' }),
  );

  app.use('/api', createWatchRouter(service));
  return app;
}
