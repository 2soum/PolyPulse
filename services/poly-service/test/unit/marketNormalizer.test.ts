import { normalizeMarket, computeBoost } from '../../src/services/marketNormalizer';
import { KeywordCategoryRepository } from '../../src/data/categoryRepository';
import { RawMarket } from '../../src/services/polymarketClient';

const categories = new KeywordCategoryRepository();

const RAW: RawMarket = {
  id: '123',
  slug: 'australia-wc',
  question: 'Will Australia win the 2026 FIFA World Cup?',
  outcomes: '["Yes", "No"]',
  outcomePrices: '["0.0015", "0.9985"]',
  volume24hr: 10006303.76,
  liquidityNum: 11817333.02,
  spread: 0.001,
  oneDayPriceChange: 0.034,
  oneWeekPriceChange: null,
  rewardsMinSize: 100,
  rewardsMaxSpread: 2.5,
  holdingRewardsEnabled: true,
  icon: 'http://img',
  endDate: '2026-07-19',
};

describe('computeBoost', () => {
  it('flags markets with LP or holding rewards as boosted', () => {
    expect(computeBoost(RAW).boosted).toBe(true);
  });

  it('scores LP + holding + spread room (40+40+ up to 20)', () => {
    // minSize>0 -> 40, holding -> 40, maxSpread 2.5/5*20 -> 10  => 90
    expect(computeBoost(RAW).score).toBe(90);
  });

  it('returns not boosted with score 0 when no rewards', () => {
    const boost = computeBoost({ rewardsMinSize: 0, holdingRewardsEnabled: false });
    expect(boost.boosted).toBe(false);
    expect(boost.score).toBe(0);
  });

  it('caps the spread component at 20 points', () => {
    const boost = computeBoost({ rewardsMinSize: 50, rewardsMaxSpread: 50 });
    expect(boost.score).toBe(60); // 40 (LP) + 20 (spread capped), no holding
  });
});

describe('normalizeMarket', () => {
  it('parses JSON-encoded outcomes/prices and resolves the Yes price', () => {
    const m = normalizeMarket(RAW, categories);
    expect(m.outcomes).toEqual(['Yes', 'No']);
    expect(m.prices).toEqual([0.0015, 0.9985]);
    expect(m.yesPrice).toBe(0.0015);
    expect(m.category).toBe('Sports');
    expect(m.volume24h).toBeCloseTo(10006303.76, 1);
    expect(m.oneDayChange).toBe(0.034);
    expect(m.oneWeekChange).toBeNull();
    expect(m.boost.boosted).toBe(true);
  });

  it('handles already-parsed arrays and missing fields', () => {
    const m = normalizeMarket({ id: 'x', outcomes: ['A', 'B'], outcomePrices: [0.4, 0.6] }, categories);
    expect(m.outcomes).toEqual(['A', 'B']);
    expect(m.yesPrice).toBe(0.4); // no "Yes" -> first price
    expect(m.question).toBe('');
    expect(m.category).toBe('Autre');
  });

  it('tolerates malformed JSON in arrays', () => {
    const m = normalizeMarket({ id: 'y', outcomes: 'not-json', outcomePrices: '{' }, categories);
    expect(m.outcomes).toEqual([]);
    expect(m.prices).toEqual([]);
    expect(m.yesPrice).toBeNull();
  });
});
