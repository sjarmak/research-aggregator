# Research Agent: AI-Powered Market Intelligence Newsletter

A specialized market intelligence system that curates, scores, and synthesizes content for **Code Intelligence & Developer Experience** — covering code search, context management, agentic workflows, and developer tooling in the era of AI.

## Quick Start

```bash
# Install dependencies
npm install

# Ingest content from RSS feeds (Inoreader)
npm run agent ingest --rss

# Ingest academic papers from arXiv
npm run agent ingest --scix --days 30

# Generate newsletter
npm run agent generate --days 30

# Generate with PDF and Slack export
npm run agent generate --days 30 --pdf --slack-text --slack "#research-updates"
```

## Architecture

### Pipeline

1. **Ingestion** (`src/lib/ingest/`)
   - **RSS Feeds**: Inoreader subscriptions (14+ feeds covering platforms, competitors, infra, research)
   - **Academic Papers**: arXiv via SciX MCP or legacy ADS integration
   - Deduplication by URL + content hash
   - Time-windowed filtering (configurable lookback period)

2. **Curation & Scoring** (`src/lib/newsletter/`)
   - **LLM Evaluation** (70% weight): GPT-4o judges relevance to code intelligence
   - **Heuristic Term Scoring** (30% weight): 8 weighted domain categories for confidence
   - **Hybrid Scoring Formula**: `(LLM × 0.7) + (Terms × 0.3) × BoostFactor`
   - Per-category scoring thresholds (7+ for research, 5+ for community, 4+ for product)

3. **Bucketing & Deduplication**
   - Category-specific routing (research, competitive, industry, product, community, newsletter, AI insights)
   - Title-based deduplication using Jaccard word similarity (60% threshold)
   - Filters out internal Sourcegraph references, excluded feeds

4. **Newsletter Generation**
   - LLM synthesizes findings into structured sections
   - Includes executive brief, per-category deep-dives
   - All items include source URLs, scores, relevance reasoning
   - PDF, Markdown, and Slack-compatible text export

### Key Components

| Component | Purpose | Key File |
|-----------|---------|----------|
| Hybrid Scorer | Combines LLM + heuristic term matching | `term-scorer.ts` |
| Curator | LLM curation with confidence signals | `curator.ts` |
| Generator | Newsletter synthesis & formatting | `generator.ts` |
| Feed Metadata | Maps feeds → categories & priorities | `feed-metadata.ts` |
| RSS Ingestion | Feed fetching with retry logic | `rss-ingest.ts` |

## Scoring System

### Term Categories (8 Weighted Domains)

1. **Information Retrieval** (1.5x) - semantic search, RAG, embeddings, vector databases
2. **Context Management** (1.5x) - context windows, compression, token budgets
3. **Code Search** (1.6x) - code indexing, navigation, codebase understanding
4. **Agentic Systems** (1.4x) - agents, tool use, planning, reasoning
5. **Enterprise Codebases** (1.3x) - monorepos, scaling, dependency graphs
6. **Developer Tools** (1.2x) - IDEs, debugging, refactoring
7. **LLM Code Architecture** (1.2x) - transformers, fine-tuning, reasoning
8. **SDLC Processes** (1.0x) - CI/CD, testing, code review

### Matching Confidence Levels

- **Exact phrase** (1.0): "semantic code search" in text
- **Consecutive words** (0.95): All term words appear in sequence
- **In-order with gaps** (0.8): Words in order but with other words between
- **Any order** (0.6): All term words present but unordered

### Final Score Example

```
Generic AI investment news:
  LLM: 7/10 (seems relevant)
  Terms: 2/10 (no code/tooling keywords)
  Final: (7 × 0.7) + (2 × 0.3) × 1.0 = 5.2 → Filtered out
  
Niche code search paper:
  LLM: 4/10 (dry academic)
  Terms: 8/10 (code search, semantic search, retrieval)
  Final: (4 × 0.7) + (8 × 0.3) × 1.15 = 6.9 → Included
```

## Feed Coverage

**Currently Active:** 14 feeds covering:
- **Competitors**: Sourcegraph, CodeRabbit
- **Platforms**: GitHub, OpenAI, Anthropic
- **Infra**: Weaviate, Elasticsearch, Vespa
- **Engineering**: Latent Space, Eugene Yan, Chip Huyen, Hacker News
- **Newsletters**: Pragmatic Engineer, TLDR Tech

**Gap Areas** (see [INOREADER_SUBSCRIPTIONS.md](./INOREADER_SUBSCRIPTIONS.md)):
- IDE/Editor tooling (Cursor, VS Code, JetBrains AI)
- Code search tools (Scope, Swimm, Pinecone)
- Enterprise tooling (Nx, Bazel, monorepo management)
- Additional research (focused arXiv feeds)

**Expected Improvement**: +40-50% coverage with recommended subscriptions.

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=sk-...        # GPT-4o for curation & newsletter
INOREADER_API_KEY=...         # Inoreader RSS sync (future)
SOURCEGRAPH_URL=...           # For Sourcegraph integration
```

### Scoring Thresholds

Configured in `generator.ts`:

| Category | Threshold | Rationale |
|----------|-----------|-----------|
| Research | 7+ | Strict - peer-reviewed only |
| Competitive | 7+ | Strict - strategic moves only |
| Industry | 7+ | Strict - major announcements |
| Product | 4+ | Relaxed - minor updates matter |
| Community | 5+ | Relaxed - sentiment signals valuable |
| Newsletter | 5+ | Relaxed - curated content |
| AI Insights | 5+ | Relaxed - emerging trends |

## Output Examples

### Newsletter Structure

```markdown
# Market Intelligence: Code Search, Context, & Developer Experience
## Executive Brief
[2-3 key trends this week]

## Research
[3-7 arXiv papers with scores and reasoning]

## Product Updates & Changelogs
[GitHub, OpenAI, Anthropic features]

## Competitive Intelligence
[Sourcegraph, CodeRabbit, Cursor moves]

## AI Insights & Architecture
[LLM architecture, agent design patterns]

## Industry Trends
[Broader tech developments]

## Developer Community Signal
[Reddit, forum discussions, sentiment]

## Weekly Newsletter Digests
[TLDR, Pragmatic Engineer highlights]
```

### Score Reasoning Format

```
Score: 7.8
Reasoning: Introduces memory-augmented generation for LLMs, directly applicable to agent context management. 
[Term match: context_management, confidence: 0.85]
```

## Development

### Build

```bash
npm run build          # TypeScript → dist/
npm run lint           # ESLint + TypeScript
npm run test -- --run  # Unit tests
```

### Project Structure

```
src/
├── lib/
│   ├── ingest/         # RSS, papers, classification
│   ├── newsletter/     # Curation, scoring, generation
│   ├── store/          # JSON-based article storage
│   ├── llm/            # OpenAI client with retry logic
│   └── logger.ts       # Structured logging
├── cli.ts              # Command-line interface
└── index.ts            # MCP agent entry point
```

### Key Files

- `curator.ts` - LLM-based relevance judgment
- `term-scorer.ts` - Domain-specific heuristic scoring
- `generator.ts` - Bucketing, deduplication, synthesis
- `rss-ingest.ts` - Feed fetching and ingestion
- `feed-metadata.ts` - Feed categorization

## Known Issues & Improvements

### Current Limitations

1. **Feed Coverage**: Only 14 active feeds; recommended 25+ for comprehensive coverage
2. **Competitor Signal**: 0 items in last run; activating Cursor/Codeium feeds will help
3. **Enterprise Tooling**: No monorepo/scale management feeds yet
4. **Deduplication**: Jaccard similarity catches syndication but not near-duplicate rewrites

### Planned Enhancements

- [ ] Add Cursor, Codeium, VS Code, JetBrains feeds
- [ ] Implement focused arXiv searches for code/agents
- [ ] Add semantic deduplication (embeddings-based)
- [ ] Integrate Sourcegraph Deep Search for code-specific queries
- [ ] Build custom classifiers for domain-specific content
- [ ] Add feed quality metrics (signal-to-noise per source)

## Testing

```bash
# Generate newsletter and review logs
npm run agent generate --days 7

# Check for specific bucket distribution
# Look at pre/post-filter logs to debug category routing

# Test with smaller time window
npm run agent generate --days 1

# Export for manual QA
npm run agent generate --days 30 --pdf --output test-newsletter.md
```

## Repository

- **GitHub**: https://github.com/sjarmak/research-aggregator
- **Branch**: `main`
- **Latest**: Enabled competitor & RAG feeds, added subscription guide

## License

Internal use only.
