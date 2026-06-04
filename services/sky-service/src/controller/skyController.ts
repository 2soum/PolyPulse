import { Router, Request, Response } from 'express';
import { SkyConditionsService } from '../services/skyConditionsService';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Controller (web) layer — exposes the sky assessment over HTTP.
 */
export function createSkyRouter(service: SkyConditionsService): Router {
  const router = Router();

  router.get('/assess', async (req: Request, res: Response) => {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const date = String(req.query.date ?? '');

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'invalid latitude' });
    }
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'invalid longitude' });
    }
    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: 'invalid date, expected YYYY-MM-DD' });
    }

    try {
      const assessment = await service.assess(latitude, longitude, date);
      return res.json(assessment);
    } catch {
      return res.status(502).json({ error: 'weather provider unavailable' });
    }
  });

  return router;
}
