/**
 * Data layer — classifies a market question into a category using a keyword
 * catalog. Swappable for a DB-backed taxonomy without touching the services.
 */
export interface CategoryRule {
  category: string;
  keywords: string[];
}

export interface CategoryRepository {
  classify(question: string): string;
  categories(): string[];
}

export const DEFAULT_RULES: CategoryRule[] = [
  { category: 'Sports', keywords: ['vs.', 'world cup', 'fifa', 'nba', 'nfl', 'match', 'game', 'champion', 'super bowl', 'playoff'] },
  { category: 'Politique', keywords: ['election', 'president', 'mayor', 'senate', 'governor', 'vote', 'primary', 'nominee', 'congress'] },
  { category: 'Crypto', keywords: ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'crypto', 'price of', 'all-time high', 'token'] },
  { category: 'Géopolitique', keywords: ['war', 'ceasefire', 'treaty', 'nuclear', 'sanction', 'invade', 'nato', 'putin', 'israel', 'ukraine'] },
  { category: 'Pop culture', keywords: ['movie', 'oscar', 'grammy', 'spotify', 'album', 'box office', 'time person', 'netflix'] },
];

export const OTHER = 'Autre';

export class KeywordCategoryRepository implements CategoryRepository {
  constructor(private readonly rules: CategoryRule[] = DEFAULT_RULES) {}

  classify(question: string): string {
    const q = (question ?? '').toLowerCase();
    for (const rule of this.rules) {
      if (rule.keywords.some((kw) => q.includes(kw))) {
        return rule.category;
      }
    }
    return OTHER;
  }

  categories(): string[] {
    return [...this.rules.map((r) => r.category), OTHER];
  }
}
