import { Router, Request, Response } from 'express';
import { WatchService } from '../services/watchService';
import { NotFoundError, ValidationError } from '../errors';

/**
 * Controller (web) layer — watchlist & dashboard REST endpoints.
 */
export function createWatchRouter(service: WatchService): Router {
  const router = Router();

  router.get('/categories', async (_req: Request, res: Response) => {
    try {
      res.json(await service.categories());
    } catch {
      res.status(502).json({ error: 'poly-service unavailable' });
    }
  });

  router.get('/discover', async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 12);
    const category = req.query.category ? String(req.query.category) : undefined;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'limit must be an integer between 1 and 100' });
    }
    try {
      return res.json(await service.discover(limit, category));
    } catch {
      return res.status(502).json({ error: 'poly-service unavailable' });
    }
  });

  router.get('/dashboard', async (_req: Request, res: Response) => {
    try {
      res.json(await service.getDashboard());
    } catch {
      res.status(502).json({ error: 'poly-service unavailable' });
    }
  });

  router.post('/watchlist', async (req: Request, res: Response) => {
    try {
      const market = await service.addMarket(String(req.body?.marketId ?? ''));
      res.status(201).json(market);
    } catch (err) {
      handle(err, res);
    }
  });

  router.delete('/watchlist/:marketId', async (req: Request, res: Response) => {
    try {
      await service.removeMarket(req.params.marketId);
      res.status(204).send();
    } catch (err) {
      handle(err, res);
    }
  });

  return router;
}

function handle(err: unknown, res: Response): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  res.status(502).json({ error: 'poly-service unavailable' });
}
