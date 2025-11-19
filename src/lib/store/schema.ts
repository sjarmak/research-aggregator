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
  libraryId: z.string().optional(), // Which ADS library this came from
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
  ingestedAt: z.string(),
  tags: z.array(z.string()).optional(),
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
