import express, { Express, Request, Response } from 'express';
import { createSpotRouter } from './controller/spotController';
import { SpotService } from './services/spotService';

/** Builds the Express application. Side-effect free for testability. */
export function createApp(service: SpotService): Express {
  const app = express();
  app.use(express.json());

  // Permissive CORS so the static frontend (served from another origin) can call us.
  app.use((_req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/health', (_req: Request, res: Response) =>
    res.json({ status: 'ok', service: 'spot-service' }),
  );

  app.use('/api/spots', createSpotRouter(service));
  return app;
}
