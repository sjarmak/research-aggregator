import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { adsClient } from "../lib/ads/client.js";
import { store } from "../lib/store/json-store.js";

// Create server instance
const server = new Server(
  {
    name: "ads-server",
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
  return {
    tools: [
      {
        name: "ads_search",
        description: "Search for academic papers in the NASA ADS database",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (e.g., 'author:\"Smith, J\" year:2023' or keywords)",
            },
            rows: {
              type: "number",
              description: "Number of results to return (default: 10)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "ads_get_paper",
        description: "Get details for a specific paper by bibcode",
        inputSchema: {
          type: "object",
          properties: {
            bibcode: {
              type: "string",
              description: "The ADS bibcode of the paper",
            },
          },
          required: ["bibcode"],
        },
      },
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
        description: "Run a research query against ADS, local papers, and local RSS in parallel and return merged results.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            },
            max_ads_results: {
              type: "number",
              description: "Max results from ADS (default: 5)"
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
        name: "ads_list_libraries",
        description: "List all ADS libraries owned by the user",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "ads_get_library_papers",
        description: "Get papers from a specific ADS library",
        inputSchema: {
          type: "object",
          properties: {
            libraryId: {
              type: "string",
              description: "The ID of the library to fetch papers from",
            },
          },
          required: ["libraryId"],
        },
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
      }
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "lookup_personal_papers") {
        await store.init();
        const libraryId = args?.libraryId ? String(args.libraryId) : undefined;
        const limit = args?.limit ? Number(args.limit) : 20;
        
        let papers = libraryId ? store.getPapersByLibrary(libraryId) : store.getAllPapers();
        
        // Sort by year desc for relevance
        papers.sort((a, b) => (b.year ? parseInt(b.year) : 0) - (a.year ? parseInt(a.year) : 0));
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify(papers.slice(0, limit), null, 2)
            }]
        };
    }

    if (name === "get_recent_articles") {
        await store.init();
        const limit = args?.limit ? Number(args.limit) : 10;
        const articles = store.getAllArticles()
            .sort((a, b) => {
                const tA = new Date(a.publishedAt || a.ingestedAt || 0).getTime();
                const tB = new Date(b.publishedAt || b.ingestedAt || 0).getTime();
                return tB - tA;
            })
            .slice(0, limit);
            
        return {
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
    }

    if (name === "get_recent_papers_context") {
        await store.init();
        const limit = args?.limit ? Number(args.limit) : 10;
        const libraryId = args?.libraryId ? String(args.libraryId) : undefined;
        
        let papers = libraryId ? store.getPapersByLibrary(libraryId) : store.getAllPapers();
        papers = papers.sort((a, b) => new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime())
                       .slice(0, limit);
                       
        const context = papers.map(p => 
            `[${p.bibcode}] ${p.title} (${p.year})\nAuthors: ${p.authors.join(', ')}\nAbstract: ${p.abstract || 'N/A'}`
        ).join('\n---\n');
        
        return {
            content: [{
                type: "text",
                text: context
            }]
        };
    }

    if (name === "multi_source_research") {
        await store.init();
        const query = String(args?.query).toLowerCase();
        const maxAds = args?.max_ads_results ? Number(args.max_ads_results) : 5;
        const useLocal = args?.use_local_papers !== false; // default true
        const useRss = args?.use_rss !== false; // default true
        
        const tasks = [];
        
        // 1. ADS Search
        tasks.push(
            adsClient.search(query, { rows: maxAds })
                .then(res => ({ source: 'ads', results: res }))
                .catch(err => ({ source: 'ads', error: String(err) }))
        );
        
        // 2. Local Papers (Simple text match)
        if (useLocal) {
            tasks.push(Promise.resolve().then(() => {
                const matches = store.getAllPapers().filter(p => 
                    p.title.toLowerCase().includes(query) || 
                    (p.abstract && p.abstract.toLowerCase().includes(query))
                ).slice(0, 10); // limit local matches
                return { source: 'local_papers', results: matches };
            }));
        }
        
        // 3. RSS Articles (Simple text match)
        if (useRss) {
            tasks.push(Promise.resolve().then(() => {
                const matches = store.getAllArticles().filter(a => 
                    a.title.toLowerCase().includes(query) || 
                    (a.summary && a.summary.toLowerCase().includes(query))
                ).slice(0, 10);
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
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
            }]
        };
    }

    if (name === "ads_search") {
      const query = String(args?.query);
      const rows = args?.rows ? Number(args.rows) : 10;
      const results = await adsClient.search(query, { rows });
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }

    if (name === "ads_get_paper") {
      const bibcode = String(args?.bibcode);
      const paper = await adsClient.getPaper(bibcode);
      
      if (!paper) {
        return {
          content: [
            {
              type: "text",
              text: "Paper not found",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(paper, null, 2),
          },
        ],
      };
    }

    if (name === "ads_list_libraries") {
      const libraries = await adsClient.getLibraries();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(libraries, null, 2),
          },
        ],
      };
    }

    if (name === "ads_get_library_papers") {
      const libraryId = String(args?.libraryId);
      const papers = await adsClient.getLibraryPapers(libraryId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(papers, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Connect transport
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error("Server connection error:", error);
  process.exit(1);
});
