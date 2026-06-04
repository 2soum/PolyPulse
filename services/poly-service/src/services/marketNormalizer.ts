import { BoostInfo, NormalizedMarket } from '../data/types';
import { CategoryRepository } from '../data/categoryRepository';
import { RawMarket } from './polymarketClient';

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  return Number.isFinite(n) ? n : fallback;
}

function optNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  return Number.isFinite(n) ? n : null;
}

/** Polymarket returns `outcomes`/`outcomePrices` as JSON-encoded strings. */
function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function computeBoost(raw: RawMarket): BoostInfo {
  const minSize = num(raw.rewardsMinSize);
  const maxSpread = num(raw.rewardsMaxSpread);
  const holdingRewards = Boolean(raw.holdingRewardsEnabled);
  const boosted = minSize > 0 || holdingRewards;

  // Explainable score: LP rewards (40) + holding rewards (40) + spread room (≤20).
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        40 * (minSize > 0 ? 1 : 0) +
          40 * (holdingRewards ? 1 : 0) +
          20 * Math.min(1, maxSpread / 5),
      ),
    ),
  );

  return { boosted, score, minSize, maxSpread, holdingRewards };
}

export function normalizeMarket(raw: RawMarket, categories: CategoryRepository): NormalizedMarket {
  const outcomes = parseArray(raw.outcomes);
  const prices = parseArray(raw.outcomePrices).map((p) => num(p));
  const question = String(raw.question ?? '');

  const yesIndex = outcomes.findIndex((o) => o.toLowerCase() === 'yes');
  const yesPrice =
    yesIndex >= 0 && prices[yesIndex] !== undefined
      ? prices[yesIndex]
      : prices.length > 0
        ? prices[0]
        : null;

  return {
    id: String(raw.id ?? ''),
    slug: String(raw.slug ?? ''),
    question,
    category: categories.classify(question),
    icon: raw.icon ? String(raw.icon) : undefined,
    outcomes,
    prices,
    yesPrice,
    volume24h: num(raw.volume24hr),
    liquidity: num(raw.liquidityNum ?? raw.liquidity),
    spread: num(raw.spread),
    oneDayChange: optNum(raw.oneDayPriceChange),
    oneWeekChange: optNum(raw.oneWeekPriceChange),
    endDate: raw.endDate ? String(raw.endDate) : undefined,
    boost: computeBoost(raw),
  };
}
