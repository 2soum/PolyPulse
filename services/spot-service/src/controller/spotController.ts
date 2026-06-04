import { Router, Request, Response } from 'express';
import { SpotService } from '../services/spotService';
import { NotFoundError, ValidationError } from '../errors';

/**
 * Controller (web) layer — REST endpoints for spots and session planning.
 */
export function createSpotRouter(service: SpotService): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    res.json(await service.list());
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const spot = await service.create(req.body);
      res.status(201).json(spot);
    } catch (err) {
      handle(err, res);
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      res.json(await service.get(req.params.id));
    } catch (err) {
      handle(err, res);
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await service.remove(req.params.id);
      res.status(204).send();
    } catch (err) {
      handle(err, res);
    }
  });

  router.post('/:id/plan', async (req: Request, res: Response) => {
    try {
      const plan = await service.planSession(req.params.id, String(req.body?.date ?? ''));
      res.json(plan);
    } catch (err) {
      handle(err, res, true);
    }
  });

  return router;
}

/** Maps domain errors to HTTP status codes. */
function handle(err: unknown, res: Response, downstream = false): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (downstream) {
    res.status(502).json({ error: 'sky-service unavailable' });
    return;
  }
  res.status(500).json({ error: 'internal error' });
}
