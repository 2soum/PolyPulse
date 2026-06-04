import express, { Express, Request, Response } from 'express';
import { createSkyRouter } from './controller/skyController';
import { SkyConditionsService } from './services/skyConditionsService';

/** Builds the Express application. Kept free of side effects for testability. */
export function createApp(service: SkyConditionsService): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) =>
    res.json({ status: 'ok', service: 'sky-service' }),
  );

  app.use('/api/sky', createSkyRouter(service));
  return app;
}
