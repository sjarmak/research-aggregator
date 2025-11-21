import { logger } from "../logger.js";
import { config } from "../../config.js";
import { sgClient } from "../sourcegraph/client.js";
import { store } from "../store/json-store.js";
import { generateCompletion } from "../llm/client.js";
import { ingestRecentPapers } from "../ingest/ads-ingest.js";
import { ingestRssFeeds } from "../ingest/rss-ingest.js";
import { curateContent } from "../newsletter/curator.js";
import { generateNewsletter } from "../newsletter/generator.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';

// Schema definitions for tool arguments
const GetRecentArticlesSchema = z.object({
  limit: z.coerce.number().optional(),
});

const GetRecentPapersContextSchema = z.object({
  limit: z.coerce.number().optional(),
  libraryId: z.string().optional(),
});

const MultiSourceResearchSchema = z.object({
  query: z.string(),
  use_local_papers: z.boolean().optional(),
  use_rss: z.boolean().optional(),
  synthesize: z.boolean().optional(),
});

const GenerateNewsletterSchema = z.object({
  days: z.coerce.number().default(7),
});

const LookupPersonalPapersSchema = z.object({
  libraryId: z.string().optional(),
  limit: z.coerce.number().optional(),
});

const IngestPapersSchema = z.object({
  days: z.coerce.number().default(7),
  query: z.string().optional(),
});

const SgSearchSchema = z.object({
  query: z.string(),
  pattern_type: z.enum(["literal", "regexp", "structural"]).optional(),
});

const SgReadFileSchema = z.object({
  repository: z.string(),
  path: z.string(),
  revision: z.string().optional(),
});

export const toolDefinitions = [
  {
    name: "get_recent_articles",
    description: "List recent RSS articles relevant to agents/code search/etc. from the knowledge store.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of articles to return (default: 10)"
        }
      }
    }
  },
  {
    name: "get_recent_papers_context",
    description: "Get a text snippet summarizing the most recent papers from the local knowledge store for use as LLM context.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of papers to return (default: 10)"
        },
        libraryId: {
          type: "string",
          description: "Optional: Filter by specific library ID"
        }
      }
    }
  },
  {
    name: "multi_source_research",
    description: "Run a research query against local papers and local RSS in parallel and return merged results.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        },
        use_local_papers: {
          type: "boolean",
          description: "Include results from local papers store (default: true)"
        },
        use_rss: {
          type: "boolean",
          description: "Include results from local RSS articles (default: true)"
        },
        synthesize: {
          type: "boolean",
          description: "Use an LLM to synthesize the results into a coherent summary (requires OPENAI_API_KEY)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "generate_newsletter",
    description: "Generate a weekly newsletter summarizing recent academic research and industry articles from the knowledge store.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to look back (default: 7)"
        }
      }
    }
  },
  {
    name: "lookup_personal_papers",
    description: "Search or list papers from the user's personal knowledge store (locally synced papers)",
    inputSchema: {
        type: "object",
        properties: {
            libraryId: {
                type: "string",
                description: "Optional: Filter by specific library ID"
            },
            limit: {
                type: "number",
                description: "Max number of results (default 20)"
            }
        }
    }
  },
  {
    name: "ingest_rss",
    description: "Ingest recent articles from RSS feeds.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "ingest_papers",
    description: "Ingest recent academic papers from ADS/ArXiv based on a query.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to look back (default: 7)"
        },
        query: {
          type: "string",
          description: "Optional custom ADS query. Defaults to code/agent papers in cs.AI."
        }
      }
    }
  },
  {
    name: "sg_search",
    description: "Search for code, repositories, or files using Sourcegraph. Supports standard Sourcegraph queries (e.g. 'type:symbol', 'type:file', 'repo:').",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Sourcegraph search query. Examples: 'repo:my-repo file:^src/ main', 'type:symbol MyClass', 'repo:my-repo file:^src/' (list files)",
        },
        pattern_type: {
          type: "string",
          description: "Search pattern type: 'literal', 'regexp', or 'structural' (default: 'literal')",
          enum: ["literal", "regexp", "structural"],
        },
      },
      required: ["query"],
    },
  },
  {
    name: "sg_read_file",
    description: "Read a file from a repository using Sourcegraph.",
    inputSchema: {
      type: "object",
      properties: {
        repository: {
          type: "string",
          description: "Repository name (e.g. 'github.com/sourcegraph/sourcegraph')",
        },
        path: {
          type: "string",
          description: "Path to the file",
        },
        revision: {
          type: "string",
          description: "Revision (commit SHA, branch, tag) (default: 'HEAD')",
        },
      },
      required: ["repository", "path"],
    },
  }
];

export async function handleToolCall(name: string, args: any, requestId: string = 'test') {
    logger.info(`[${requestId}] Tool execution started`, { tool: name, args });

    try {
        if (name === "lookup_personal_papers") {
            const parsed = LookupPersonalPapersSchema.parse(args);
            await store.init();
            const libraryId = parsed.libraryId;
            const limit = parsed.limit || config.DEFAULT_CONTEXT_LIMIT;
            
            const papers = libraryId ? store.getPapersByLibrary(libraryId) : store.getAllPapers();
            
            // Sort by year desc for relevance
            papers.sort((a, b) => (b.year ? parseInt(b.year) : 0) - (a.year ? parseInt(a.year) : 0));
            
            const result = {
                content: [{
                    type: "text",
                    text: JSON.stringify(papers.slice(0, limit), null, 2)
                }]
            };
            logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
            return result;
        }
    
        if (name === "get_recent_articles") {
            const parsed = GetRecentArticlesSchema.parse(args);
            await store.init();
            const limit = parsed.limit || config.DEFAULT_SEARCH_LIMIT;
            const articles = store.getAllArticles()
                .sort((a, b) => {
                    // Primary sort: Score (desc)
                    // Secondary sort: Date (desc)
                    const scoreA = a.score || 0;
                    const scoreB = b.score || 0;
                    if (scoreA !== scoreB) return scoreB - scoreA;

                    const tA = new Date(a.publishedAt || a.ingestedAt || 0).getTime();
                    const tB = new Date(b.publishedAt || b.ingestedAt || 0).getTime();
                    return tB - tA;
                })
                .slice(0, limit);
                
            const result = {
                content: [{
                    type: "text",
                    text: JSON.stringify(articles.map(a => ({
                        title: a.title,
                        url: a.url,
                        summary: a.summary,
                        feed: a.feedName,
                        company: a.company,
                        type: a.contentType,
                        score: a.score,
                        tags: a.tags,
                        date: a.publishedAt || a.ingestedAt
                    })), null, 2)
                }]
            };
            logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
            return result;
        }
    
        if (name === "get_recent_papers_context") {
            const parsed = GetRecentPapersContextSchema.parse(args);
            await store.init();
            const limit = parsed.limit || config.DEFAULT_SEARCH_LIMIT;
            const libraryId = parsed.libraryId;
            
            let papers = libraryId ? store.getPapersByLibrary(libraryId) : store.getAllPapers();
            papers = papers.sort((a, b) => new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime())
                           .slice(0, limit);
                           
            const context = papers.map(p => 
                `[${p.bibcode}] ${p.title} (${p.year})\nAuthors: ${p.authors.join(', ')}\nAbstract: ${p.abstract || 'N/A'}`
            ).join('\n---\n');
            
            const result = {
                content: [{
                    type: "text",
                    text: context
                }]
            };
            logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
            return result;
        }
    
        if (name === "multi_source_research") {
            const parsed = MultiSourceResearchSchema.parse(args);
            await store.init();
            const query = parsed.query.toLowerCase();
            const useLocal = parsed.use_local_papers !== false; // default true
            const useRss = parsed.use_rss !== false; // default true
            const synthesize = parsed.synthesize === true;
            
            const tasks: Promise<{source: string, results: any} | {source: string, error: any}>[] = [];
            
            // 1. Local Papers (Simple keyword match)
            if (useLocal) {
                tasks.push(Promise.resolve().then(() => {
                    const terms = query.split(/\s+/).filter(t => t.length > 0);
                    const matches = store.getAllPapers().filter(p => {
                        const text = `${p.title} ${p.abstract || ''}`.toLowerCase();
                        return terms.every(term => text.includes(term));
                    }).slice(0, config.DEFAULT_SEARCH_LIMIT);
                    return { source: 'local_papers', results: matches };
                }));
            }
            
            // 2. RSS Articles (Simple keyword match)
            if (useRss) {
                tasks.push(Promise.resolve().then(() => {
                    const terms = query.split(/\s+/).filter(t => t.length > 0);
                    const matches = store.getAllArticles().filter(a => {
                        const text = `${a.title} ${a.summary || ''}`.toLowerCase();
                        return terms.every(term => text.includes(term));
                    }).slice(0, config.DEFAULT_SEARCH_LIMIT);
                    return { source: 'rss_articles', results: matches };
                }));
            }
            
            const results = await Promise.all(tasks);
            const response: Record<string, any> = {};
            
            results.forEach(r => {
                if ('error' in r) {
                    response[r.source] = { error: r.error };
                } else {
                    response[r.source] = r.results;
                }
            });

            if (synthesize) {
                try {
                    logger.info(`Synthesizing results for query: ${query}`);
                    const synthesis = await generateCompletion(
                        "You are a helpful research assistant. Analyze the provided research papers and articles to answer the user's query. Synthesize the information into a coherent summary, citing specific papers or articles where relevant.",
                        `User Query: ${parsed.query}\n\nSearch Results:\n${JSON.stringify(response, null, 2)}`
                    );
                    response['synthesis'] = synthesis;
                } catch (error) {
                    logger.warn('Synthesis failed', { error: error instanceof Error ? error.message : String(error) });
                    response['synthesis_error'] = "Failed to generate synthesis. Check logs for details (OPENAI_API_KEY might be missing).";
                }
            }
            
            const result = {
                content: [{
                    type: "text",
                    text: JSON.stringify(response, null, 2)
                }]
            };
            logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
            return result;
        }

        if (name === "generate_newsletter") {
            const parsed = GenerateNewsletterSchema.parse(args);
            const days = parsed.days || 7;

            try {
                // Use shared generator logic
                const newsletter = await generateNewsletter(days);
                
                const dateStr = new Date().toISOString().split('T')[0];
                const filename = `newsletter-${dateStr}.md`;
                const filePath = path.resolve(process.cwd(), filename);
                
                await fs.writeFile(filePath, newsletter, 'utf-8');
                logger.info(`Newsletter saved to ${filePath}`);

                const result = {
                    content: [{
                        type: "text",
                        text: `Newsletter generated and saved to ${filename}\n\n${newsletter}`
                    }]
                };
                logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
                return result;
            } catch (error) {
                logger.error('Newsletter generation failed', { error: error instanceof Error ? error.message : String(error) });
                return {
                    content: [{
                        type: "text",
                        text: "Failed to generate newsletter. Please check logs (OPENAI_API_KEY might be missing)."
                    }],
                    isError: true
                };
            }
        }

        if (name === "ingest_rss") {
            try {
                await ingestRssFeeds();
                const result = {
                    content: [{
                        type: "text",
                        text: `Successfully ingested recent RSS articles.`
                    }]
                };
                logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
                return result;
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed to ingest RSS feeds: ${error instanceof Error ? error.message : String(error)}`
                    }],
                    isError: true
                };
            }
        }

        if (name === "ingest_papers") {
            const parsed = IngestPapersSchema.parse(args);
            const days = parsed.days;
            const query = parsed.query;

            try {
                await ingestRecentPapers(days, query);
                const result = {
                    content: [{
                        type: "text",
                        text: `Successfully ingested recent papers for the last ${days} days.`
                    }]
                };
                logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
                return result;
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed to ingest papers: ${error instanceof Error ? error.message : String(error)}`
                    }],
                    isError: true
                };
            }
        }
    
        if (name === "sg_search") {
          const parsed = SgSearchSchema.parse(args);
          const query = parsed.query;
          const patternType = parsed.pattern_type;
          
          const results = await sgClient.search(query, { patternType });
          
          const result = {
            content: [
              {
                type: "text",
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
          logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
          return result;
        }
    
        if (name === "sg_read_file") {
          const parsed = SgReadFileSchema.parse(args);
          const repository = parsed.repository;
          const path = parsed.path;
          const revision = parsed.revision || 'HEAD';
          
          const content = await sgClient.readFile(repository, path, revision);
          
          const result = {
            content: [
              {
                type: "text",
                text: content,
              },
            ],
          };
          logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
          return result;
        }
    
        throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            logger.error(`[${requestId}] Invalid arguments for ${name}`, { error: issues });
             return {
                content: [{
                    type: "text",
                    text: `Invalid arguments: ${issues}`
                }],
                isError: true
            };
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        let userMessage = `Error executing ${name}: ${errorMessage}`;
    
        // Improve error message for common Sourcegraph API errors
        if (errorMessage.includes('Sourcegraph API Error')) {
            if (errorMessage.includes('401')) {
                userMessage = `Authentication failed for ${name}. Please check your SOURCEGRAPH_TOKEN.`;
            } else if (errorMessage.includes('404')) {
                userMessage = `Resource not found for ${name}. Verify the repository or file path.`;
            } else if (errorMessage.includes('429')) {
                 userMessage = `Rate limit exceeded for ${name}. Please try again later.`;
            }
        }
    
        logger.error(`[${requestId}] Tool execution failed`, { tool: name, error: errorMessage });
        return {
          content: [
            {
              type: "text",
              text: userMessage,
            },
          ],
          isError: true,
        };
    }
}
