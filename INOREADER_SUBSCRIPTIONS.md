# Inoreader Subscription Guide: Optimizing Newsletter Feed Coverage

## Problem Statement
The current newsletter is missing critical coverage in:
- **Code Intelligence & Search**: Codebase search, code indexing, discovery
- **Context Management**: Context windows, token budgets, compression techniques
- **Agent Memory & Retrieval**: Memory-augmented generation, retrieval strategies
- **Developer Workflows**: IDE features, refactoring tools, productivity
- **Competitive Intelligence**: 0 items in last run (no competitor feed coverage)

## Current Active Feeds (working RSS/scraper)
1. GitHub Blog (platform)
2. OpenAI News (platform)
3. Pragmatic Engineer (newsletter)
4. TLDR Tech (newsletter/scraper)
5. Latent Space (engineering blog)
6. Eugene Yan (engineering blog)
7. Sourcegraph Blog (**new** - competitive)
8. CodeRabbit (**new** - competitive)
9. Anthropic News (platform)
10. Weaviate Blog (**new** - RAG)
11. Elasticsearch Blog (**new** - search infra)
12. Vespa Blog (**new** - search infra)
13. Chip Huyen (**new** - engineering)
14. Hacker News (curated)

## Recommended Inoreader Subscriptions to Add

### 1. Developer Tool Blogs (High Priority)
These focus on IDE/editor features, refactoring, code analysis:

- **Cursor Blog**: https://cursor.com/blog (AI coding IDE - competitor)
- **Codeium Blog**: https://codeium.com/blog (code completion)
- **JetBrains IDE Blog**: https://blog.jetbrains.com/ai/feed/ (IDE AI features)
- **GitHub Copilot Blog**: Part of GitHub Blog (already have)
- **VS Code Blog**: https://code.visualstudio.com/blogs (editor features)

### 2. Code Search & Codebase Tools (High Priority)
Essential for code intelligence focus:

- **Pinecone Blog**: https://www.pinecone.io/feed.xml (vector databases for code)
- **Perplexity Labs**: Code search capabilities
- **Tree-sitter**: Code parsing/analysis tool updates
- **Scope Blog**: https://www.scope.dev (codebase intelligence)
- **Swimm**: https://swimm.io/blog (codebase knowledge)

### 3. Agent & Context Management (High Priority)
Research and tooling for agentic systems:

- **Anthropic Research**: https://www.anthropic.com/index.xml (Claude research)
- **OpenAI Research**: https://openai.com/research/rss
- **DeepSeek**: Research papers on reasoning/agents
- **Together AI Blog**: Reasoning models
- **Hugging Face Research**: https://huggingface.co/papers (ArXiv feed)

### 4. Monorepo & Enterprise Tooling (Medium Priority)
Codebase scale and dependency management:

- **Nx Blog**: https://nx.dev/blog (monorepo tooling)
- **Bazel Blog**: Build systems at scale
- **Turborepo**: Build tool for monorepos
- **Lerna**: JavaScript monorepo management
- **pnpm Blog**: Package management at scale

### 5. Testing & Code Quality (Medium Priority)
Developer workflows, QA, refactoring:

- **Vitest Blog**: Testing framework
- **Playwright Blog**: https://playwright.dev/blog (testing)
- **SonarQube Blog**: Code quality/security
- **Prettier Blog**: Code formatting
- **ESLint Blog**: Linting updates

### 6. ArXiv Custom Searches (Medium Priority)
Research papers aligned with focus areas:

Create separate feeds for:
- `arXiv: cat:cs.CL AND (agent OR retrieval OR context)` - Language models & agents
- `arXiv: cat:cs.IR AND (code OR software)` - Code information retrieval
- `arXiv: cat:cs.SE AND (search OR understanding)` - Software engineering
- `arXiv: cat:cs.AI AND (reasoning OR planning)` - Agent reasoning

Note: Already have a broad arXiv feed; these would narrow/focus it.

### 7. Industry & News Aggregators (Medium Priority)
Stay current with ecosystem developments:

- **InfoQ**: https://www.infoq.com/feed.xml (architecture & design)
- **The New Stack**: https://thenewstack.io/feed/ (infrastructure)
- **Dev.to**: https://dev.to/feed.xml (community articles)
- **Medium - AI/ML Tag**: https://medium.com/tag/artificial-intelligence/latest (broad)
- **LinkedIn Articles**: High-signal execs (manual)

### 8. Thought Leadership Blogs (Low-Medium Priority)
Foundational AI/LLM insights:

- **Yann LeCun Posts**: Meta AI Research updates
- **Geoffrey Hinton**: Deep Learning research
- **Ilya Sutskever**: OpenAI Chief Scientist (Twitter → RSS via Nitter)
- **Sam Altman**: OpenAI CEO (occasional posts)
- **Andrej Karpathy**: Tesla/OpenAI (Twitter/Medium)

## Setup Instructions

### In Inoreader:

1. **Create Custom Categories** (optional but recommended):
   - "Code Intelligence" (search, indexing, discovery)
   - "Context & Agents" (memory, retrieval, planning)
   - "Developer Tools" (IDEs, editors, tooling)
   - "Competitive Intel" (competitor products)
   - "Research & Papers" (academic, foundational)

2. **Add Subscriptions** (Inoreader → Add Subscription):
   - Paste URL → Select category → Subscribe

3. **Create Smart Streams** for filtering:
   - "Code Search & Discovery" = Articles tagged/mentioning code search, codebase, indexing
   - "Agent & Context" = Agent, memory, retrieval, context window
   - "Developer Workflows" = IDE, editor, refactoring, productivity

4. **Configure Alerts** (optional):
   - Keywords: "code search", "codebase understanding", "context window", "agent memory"
   - Alert frequency: Daily digest

## Expected Impact

Once subscriptions are added and ingested:

| Category | Current | Expected | Notes |
|----------|---------|----------|-------|
| Competitive Intel | 0 items | 20-30 | Cursor, Codeium, CodeRabbit blogs |
| Code Search | ~5 items | 25-40 | Pinecone, Weaviate, Scope, Swimm |
| Developer Tools | ~8 items | 30-50 | JetBrains, VS Code, cursor, codeium |
| Agents & Context | ~10 items | 40-60 | Anthropic research, Latent Space, papers |
| Monorepo/Enterprise | 0 items | 15-25 | Nx, Bazel, Turborepo |
| Total Quality Items | ~120 | ~200-250 | Filtered by relevance thresholds |

## Notes

- **Feed Quality**: Some blogs publish infrequently. Prioritize the "High Priority" tier first.
- **Duplication**: Many tech stories get syndicated. The deduplication system will catch 60%+ similar titles.
- **Noise Filtering**: arXiv feeds produce 100s of papers; use classifier to filter to code-relevant only.
- **Time Investment**: Add feeds incrementally; monitor signal-to-noise ratio for 2-3 weeks before adding more.

## Testing

After adding subscriptions:

```bash
# Re-ingest RSS feeds
npm run agent -- ingest --rss

# Generate newsletter with new content
npm run agent -- generate --days 30

# Inspect bucket distribution
# Check logs for pre/post-filter bucket counts
```

Expected improvement: 40-50% increase in code-intelligence-specific coverage.
