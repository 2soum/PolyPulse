import { KeywordCategoryRepository, OTHER } from '../../src/data/categoryRepository';

describe('KeywordCategoryRepository', () => {
  const repo = new KeywordCategoryRepository();

  it.each([
    ['Knicks vs. Spurs', 'Sports'],
    ['Will Australia win the 2026 FIFA World Cup?', 'Sports'],
    ['Will Oh Se-hoon win the 2026 Seoul Mayoral Election', 'Politique'],
    ['Will Bitcoin reach a new all-time high in 2026?', 'Crypto'],
    ['Will there be a ceasefire in Ukraine before July?', 'Géopolitique'],
    ['Will the movie win an Oscar?', 'Pop culture'],
  ])('classifies %s as %s', (question, expected) => {
    expect(repo.classify(question)).toBe(expected);
  });

  it('falls back to "Autre" for unknown questions', () => {
    expect(repo.classify('Some totally unrelated question')).toBe(OTHER);
  });

  it('handles empty/undefined input gracefully', () => {
    expect(repo.classify('')).toBe(OTHER);
    expect(repo.classify(undefined as unknown as string)).toBe(OTHER);
  });

  it('lists categories including the fallback', () => {
    const cats = repo.categories();
    expect(cats).toContain('Crypto');
    expect(cats[cats.length - 1]).toBe(OTHER);
  });
});
