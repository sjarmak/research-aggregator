import { z } from 'zod';

// Core schema for a research paper
export const PaperSchema = z.object({
  id: z.string(), // Internal ID (could be UUID or derived from bibcode)
  bibcode: z.string(), // ADS Bibcode (unique identifier in ADS)
  title: z.string(),
  authors: z.array(z.string()),
  year: z.string().optional(),
  abstract: z.string().optional(),
  publication: z.string().optional(), // Journal or conference name
  url: z.string().optional(), // Link to ADS or publisher
  keywords: z.array(z.string()).optional(),
  
  // Metadata for our system
  source: z.literal('ads'),
  ingestedAt: z.string(), // ISO date
  publishedAt: z.string().optional(), // ISO date from ADS pubdate
  libraryId: z.string().optional(), // Which ADS library this came from
  
  // Enhanced classification fields (same as ExternalArticle)
  contentType: z.enum(['product_launch', 'feature_update', 'pricing_business', 'security_incident', 'funding_mna', 'benchmark_eval', 'thought_leadership', 'general']).optional(),
  tags: z.array(z.string()).optional(),
  score: z.number().optional(),
});

export type Paper = z.infer<typeof PaperSchema>;

// Schema for external articles (RSS, blogs, news)
export const ExternalArticleSchema = z.object({
  id: z.string(), // Unique ID (e.g., URL hash or GUID)
  title: z.string(),
  url: z.string(),
  content: z.string().optional(), // Full content or snippet
  summary: z.string().optional(),
  publishedAt: z.string().optional(), // ISO date
  author: z.string().optional(),
  
  // Metadata
  source: z.literal('rss'),
  feedName: z.string(), // e.g., "Hacker News", "ArXiv: Astro-ph"
  
  // Enhanced classification fields
  sourceType: z.enum(['competitor_blog', 'platform_blog', 'infra_blog', 'curated_ai', 'engineering_blog', 'general']).optional(),
  company: z.string().optional(),
  contentType: z.enum(['product_launch', 'feature_update', 'pricing_business', 'security_incident', 'funding_mna', 'benchmark_eval', 'thought_leadership', 'general']).optional(),
  score: z.number().optional(),
  
  ingestedAt: z.string(),
  tags: z.array(z.string()).optional(), // axis tags
});

export type ExternalArticle = z.infer<typeof ExternalArticleSchema>;

// Union type for any knowledge item
export const KnowledgeItemSchema = z.discriminatedUnion('source', [
  PaperSchema,
  ExternalArticleSchema
]);

export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;

// Schema for storing the full collection of papers
export const KnowledgeStoreSchema = z.object({
  papers: z.array(PaperSchema),
  articles: z.array(ExternalArticleSchema).default([]), // Backward compat: default to empty
  lastSync: z.string(),
});

export type KnowledgeStore = z.infer<typeof KnowledgeStoreSchema>;
