import { Spot, NewSpot } from '../data/types';
import { SpotRepository } from '../data/spotRepository';
import { SkyGateway, SkyAssessment } from './skyClient';
import { NotFoundError, ValidationError } from '../errors';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface SessionPlan {
  spot: Spot;
  date: string;
  assessment: SkyAssessment;
  recommended: boolean;
}

/**
 * Service layer — observation-spot business logic. Orchestrates the Data layer
 * (repository) and the companion sky-service (via SkyGateway).
 */
export class SpotService {
  constructor(
    private readonly repository: SpotRepository,
    private readonly sky: SkyGateway,
  ) {}

  list(): Promise<Spot[]> {
    return this.repository.list();
  }

  async get(id: string): Promise<Spot> {
    const spot = await this.repository.get(id);
    if (!spot) {
      throw new NotFoundError(`spot ${id} not found`);
    }
    return spot;
  }

  async create(input: NewSpot): Promise<Spot> {
    this.validate(input);
    return this.repository.create({
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      description: input.description?.trim() || undefined,
    });
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`spot ${id} not found`);
    }
  }

  /** Plans an observation by asking sky-service to score the spot for a date. */
  async planSession(spotId: string, date: string): Promise<SessionPlan> {
    if (!DATE_RE.test(date)) {
      throw new ValidationError('invalid date, expected YYYY-MM-DD');
    }
    const spot = await this.get(spotId);
    const assessment = await this.sky.assess(spot.latitude, spot.longitude, date);
    return { spot, date, assessment, recommended: assessment.recommended };
  }

  private validate(input: NewSpot): void {
    if (!input.name || !input.name.trim()) {
      throw new ValidationError('name is required');
    }
    if (
      typeof input.latitude !== 'number' ||
      Number.isNaN(input.latitude) ||
      input.latitude < -90 ||
      input.latitude > 90
    ) {
      throw new ValidationError('latitude must be between -90 and 90');
    }
    if (
      typeof input.longitude !== 'number' ||
      Number.isNaN(input.longitude) ||
      input.longitude < -180 ||
      input.longitude > 180
    ) {
      throw new ValidationError('longitude must be between -180 and 180');
    }
  }
}
