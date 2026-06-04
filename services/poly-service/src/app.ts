import express, { Express, Request, Response } from 'express';
import { createMarketRouter } from './controller/marketController';
import { MarketService } from './services/marketService';

/** Builds the Express application (side-effect free for testability). */
export function createApp(service: MarketService): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) =>
    res.json({ status: 'ok', service: 'poly-service' }),
  );

  app.use('/api/markets', createMarketRouter(service));
  return app;
}
