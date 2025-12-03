/**
 * Feed Metadata Configuration
 * Maps feed names/IDs to their semantic categories and newsletter-specific roles
 * This allows bucketing content beyond just Inoreader's default categorization
 */

export type NewsletterCategory = 
  | 'developer_newsletters'
  | 'tech_company_blogs'
  | 'developer_communities'
  | 'ai_articles'
  | 'coding_product_updates'
  | 'arxiv_research'
  | 'general_tech_articles';

export interface FeedMetadata {
  name: string;
  inoreaderCategory?: string;
  newsCategory: NewsletterCategory;
  priority: number; // Higher = more valuable for aggregation
}

const FEED_METADATA: Record<string, FeedMetadata> = {
  // Developer Newsletters (Curated Content Digests)
  'TLDR': {
    name: 'TLDR',
    newsCategory: 'developer_newsletters',
    priority: 3,
  },
  'Pragmatic Engineer': {
    name: 'Pragmatic Engineer',
    newsCategory: 'developer_newsletters',
    priority: 3,
  },
  'Byte Byte Go': {
    name: 'Byte Byte Go',
    newsCategory: 'developer_newsletters',
    priority: 3,
  },
  'Pointer': {
    name: 'Pointer',
    newsCategory: 'developer_newsletters',
    priority: 3,
  },
  'Programming Digest': {
    name: 'Programming Digest',
    newsCategory: 'developer_newsletters',
    priority: 3,
  },
  'Architecture Notes': {
    name: 'Architecture Notes',
    newsCategory: 'developer_newsletters',
    priority: 3,
  },
  'System Design': {
    name: 'System Design',
    newsCategory: 'developer_newsletters',
    priority: 3,
  },
  'Leadership in Tech': {
    name: 'Leadership in Tech',
    newsCategory: 'developer_newsletters',
    priority: 3,
  },

  // Developer Communities (Reddit, Forums, etc.)
  'Devops': {
    name: 'Devops',
    inoreaderCategory: 'Developer Communities',
    newsCategory: 'developer_communities',
    priority: 2,
  },
  'vibecoding': {
    name: 'vibecoding',
    inoreaderCategory: 'Developer Communities',
    newsCategory: 'developer_communities',
    priority: 2,
  },
  'VibeCodeDevs': {
    name: 'VibeCodeDevs',
    inoreaderCategory: 'Developer Communities',
    newsCategory: 'developer_communities',
    priority: 2,
  },

  // Coding Product Updates & Changelogs
  'The GitHub Blog': {
    name: 'The GitHub Blog',
    inoreaderCategory: 'Coding Agent Product Updates',
    newsCategory: 'coding_product_updates',
    priority: 3,
  },
  'Changelogs – The GitHub Blog': {
    name: 'Changelogs – The GitHub Blog',
    inoreaderCategory: 'Coding Agent Product Updates',
    newsCategory: 'coding_product_updates',
    priority: 3,
  },
  'OpenAI News': {
    name: 'OpenAI News',
    inoreaderCategory: 'Coding Agent Product Updates',
    newsCategory: 'coding_product_updates',
    priority: 2,
  },
  'Anthropic News': {
    name: 'Anthropic News',
    inoreaderCategory: 'Coding Agent Product Updates',
    newsCategory: 'coding_product_updates',
    priority: 2,
  },
  'Amp News': {
    name: 'Amp News',
    inoreaderCategory: 'Coding Agent Product Updates',
    newsCategory: 'coding_product_updates',
    priority: 2,
  },
  'Codeium Blog Posts': {
    name: 'Codeium Blog Posts',
    inoreaderCategory: 'Coding Agent Product Updates',
    newsCategory: 'coding_product_updates',
    priority: 2,
  },
  'Cursor Changelog RSS Feed': {
    name: 'Cursor Changelog RSS Feed',
    inoreaderCategory: 'Coding Agent Product Updates',
    newsCategory: 'coding_product_updates',
    priority: 2,
  },

  // AI Articles & Insights
  'The AI Daily Brief (Formerly The AI Breakdown): Artificial Intelligence News and Analysis': {
    name: 'The AI Daily Brief',
    inoreaderCategory: 'AI Articles',
    newsCategory: 'ai_articles',
    priority: 2,
  },
  'Artificial Intelligence News • AI News • AI Blog': {
    name: 'Artificial Intelligence News',
    inoreaderCategory: 'AI Articles',
    newsCategory: 'ai_articles',
    priority: 2,
  },
  'Made by Agents': {
    name: 'Made by Agents',
    inoreaderCategory: 'AI Articles',
    newsCategory: 'ai_articles',
    priority: 2,
  },
  'LLM Watch': {
    name: 'LLM Watch',
    inoreaderCategory: 'AI Articles',
    newsCategory: 'ai_articles',
    priority: 2,
  },
  'Latent Space': {
    name: 'Latent Space',
    inoreaderCategory: 'AI Articles',
    newsCategory: 'ai_articles',
    priority: 3,
  },
  'a16z Podcast': {
    name: 'a16z Podcast',
    inoreaderCategory: 'AI Articles',
    newsCategory: 'ai_articles',
    priority: 2,
  },

  // Tech Company Blogs (General)
  'Engineering Blog – Databricks': {
    name: 'Databricks',
    inoreaderCategory: 'Tech Company Blogs',
    newsCategory: 'tech_company_blogs',
    priority: 1,
  },
  'Stack Overflow Blog': {
    name: 'Stack Overflow',
    inoreaderCategory: 'Tech Articles',
    newsCategory: 'tech_company_blogs',
    priority: 1,
  },
};

export function getFeedMetadata(feedName: string): FeedMetadata | undefined {
  // Exact match
  if (FEED_METADATA[feedName]) {
    return FEED_METADATA[feedName];
  }

  // Partial match (for feeds that may have slight name variations)
  for (const [key, meta] of Object.entries(FEED_METADATA)) {
    if (feedName.includes(key) || key.includes(feedName)) {
      return meta;
    }
  }

  return undefined;
}

export function getAllMetadata(): Record<string, FeedMetadata> {
  return FEED_METADATA;
}
