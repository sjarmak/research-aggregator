import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "../config.js";
import { sgClient } from "../lib/sourcegraph/client.js";
import { store } from "../lib/store/json-store.js";
import { logger } from "../lib/logger.js";

// Create server instance
const server = new Server(
  {
    name: "research-tools",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug("Received ListToolsRequest");
  return {
    tools: [
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
            }
          },
          required: ["query"]
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
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const requestId = Math.random().toString(36).substring(7);
  
  logger.info(`[${requestId}] Tool execution started`, { tool: name, args });

  try {
    if (name === "lookup_personal_papers") {
        await store.init();
        const libraryId = args?.libraryId ? String(args.libraryId) : undefined;
        const limit = args?.limit ? Number(args.limit) : config.DEFAULT_CONTEXT_LIMIT;
        
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
        await store.init();
        const limit = args?.limit ? Number(args.limit) : config.DEFAULT_SEARCH_LIMIT;
        const articles = store.getAllArticles()
            .sort((a, b) => {
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
                    date: a.publishedAt || a.ingestedAt
                })), null, 2)
            }]
        };
        logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
        return result;
    }

    if (name === "get_recent_papers_context") {
        await store.init();
        const limit = args?.limit ? Number(args.limit) : config.DEFAULT_SEARCH_LIMIT;
        const libraryId = args?.libraryId ? String(args.libraryId) : undefined;
        
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
        await store.init();
        const query = String(args?.query).toLowerCase();
        const useLocal = args?.use_local_papers !== false; // default true
        const useRss = args?.use_rss !== false; // default true
        
        const tasks: Promise<{source: string, results: any} | {source: string, error: any}>[] = [];
        
        // 1. Local Papers (Simple text match)
        if (useLocal) {
            tasks.push(Promise.resolve().then(() => {
                const matches = store.getAllPapers().filter(p => 
                    p.title.toLowerCase().includes(query) || 
                    (p.abstract && p.abstract.toLowerCase().includes(query))
                ).slice(0, config.DEFAULT_SEARCH_LIMIT); // limit local matches
                return { source: 'local_papers', results: matches };
            }));
        }
        
        // 2. RSS Articles (Simple text match)
        if (useRss) {
            tasks.push(Promise.resolve().then(() => {
                const matches = store.getAllArticles().filter(a => 
                    a.title.toLowerCase().includes(query) || 
                    (a.summary && a.summary.toLowerCase().includes(query))
                ).slice(0, config.DEFAULT_SEARCH_LIMIT);
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
        
        const result = {
            content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
            }]
        };
        logger.debug(`[${requestId}] Tool execution completed`, { tool: name });
        return result;
    }

    if (name === "sg_search") {
      const query = String(args?.query);
      const patternType = args?.pattern_type as 'literal' | 'regexp' | 'structural' | undefined;
      
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
      const repository = String(args?.repository);
      const path = String(args?.path);
      const revision = args?.revision ? String(args.revision) : 'HEAD';
      
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
});

// Connect transport
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  logger.error("Server connection error", { error });
  process.exit(1);
});
