import { Router, Request, Response } from 'express';
import { MarketService } from '../services/marketService';

/**
 * Controller (web) layer — exposes normalized Polymarket data over HTTP.
 */
export function createMarketRouter(service: MarketService): Router {
  const router = Router();

  router.get('/categories', (_req: Request, res: Response) => {
    res.json(service.listCategories());
  });

  router.get('/boosted', async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 20);
    const category = req.query.category ? String(req.query.category) : undefined;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'limit must be an integer between 1 and 100' });
    }
    try {
      return res.json(await service.getBoosted(limit, category));
    } catch {
      return res.status(502).json({ error: 'polymarket upstream unavailable' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const market = await service.getMarket(req.params.id);
      if (!market) return res.status(404).json({ error: 'market not found' });
      return res.json(market);
    } catch {
      return res.status(502).json({ error: 'polymarket upstream unavailable' });
    }
  });

  return router;
}
