import { generateCompletion } from '../llm/client.js';
import { KnowledgeItem } from '../store/schema.js';
import { logger } from '../logger.js';

export interface ScoredItem {
    id: string;
    score: number; // 0-10
    reasoning: string;
    item: KnowledgeItem;
}

const CURATION_CRITERIA = `
We are interested in **Code Search, Context Management, and Developer Tools for Large Codebases in the Era of AI**.

**STRICT INCLUSION CRITERIA (Score 7-10)**:
The content MUST be about:
1. **Code Search & Discovery**: Semantic code search, codebase indexing, navigation, retrieval for large repositories.
2. **Context Management**: Managing context windows for LLMs over code, RAG for code, codebase understanding, multi-file reasoning.
3. **Developer Tools for Enterprise Codebases**: IDEs, code intelligence, refactoring, testing tools designed for large teams and repositories.
4. **Information Retrieval in Software Development**: Documentation search, API discovery, finding relevant code, extracting signals from codebases.
5. **AI Agents in Software Development**: Agents that write code, review code, fix bugs, understand requirements, plan implementation in multi-file contexts.
6. **Competitive Intel**: Product launches, funding, or major updates from companies in code intelligence space (Sourcegraph, CodeRabbit, Augment, Cursor, etc.).
7. **Research**: LLM architectures applicable to code, reasoning over code, agentic systems, retrieval methods for software engineering.

**SECONDARY INCLUSION (Score 5-6)**:
- General AI engineering best practices that apply to code understanding
- LLM benchmarks or evaluations focused on coding tasks
- Architecture patterns for handling large contexts in agentic systems
- Trends in developer experience and AI tooling adoption

**EXCLUDE / DOWNGRADE (Score < 5)**:
1. **Consumer AI/LLM News**: Generic benchmarks or general LLM comparisons without coding relevance.
2. **Unrelated Web Dev**: Frontend frameworks, CSS, design patterns not related to code intelligence.
3. **Consumer Tech**: Gadgets, social media, non-technical news.
4. **Business/Policy**: Crypto, regulatory news, unrelated layoffs.
5. **Low-Quality Content**: Spam, clickbait, low-signal articles.

**SCORING GUIDE**:
- **9-10**: Core breakthrough on code understanding, agent reasoning over codebases, major product launch, significant research.
- **7-8**: Strong relevance to AI agents, context management, enterprise dev tools, or engineering best practices.
- **5-6**: Tangentially relevant (general AI patterns, broader LLM context, developer experience trends).
- **0-4**: Irrelevant or low quality.
`;

// Per-category curation criteria - focused on core relevance to developer tooling, context management, retrieval, agents
const CATEGORY_CRITERIA: Record<string, string> = {
    research: `
**RESEARCH PAPERS (arXiv, Academic)**:
STRICT RELEVANCE: Only include papers with DIRECT connection to code tooling, agents, context, or retrieval.
Must relate to: Code understanding/search, context management for LLMs, agents for development, information retrieval for code, LLM architectures for coding.
- **9-10**: Breakthrough on code understanding agents, context management for coding, retrieval for development
- **7-8**: Strong relevance to agent reasoning over code, LLM context for code, or information retrieval in SE
- **5-6**: Relevant to LLM architectures with some connection to code/tooling application (must be clear)
- **0-4**: General LLM papers without code/tooling application, or irrelevant
`,
    newsletter: `
**DEVELOPER NEWSLETTERS (TLDR, Pragmatic Engineer, etc.)**:
STRICT RELEVANCE: Only score high if article connects to developer tooling, code agents, context, or retrieval.
- **9-10**: Directly covers code intelligence tools, AI agents for dev, developer experience with AI
- **7-8**: High-quality signal on development tools, AI adoption, or code-related practices
- **5-6**: Developer content with CLEAR connection to tooling, AI, or code intelligence (must apply to our focus)
- **0-4**: Generic developer content unrelated to code tooling, agents, or context management
`,
    community: `
**COMMUNITY SIGNALS (Reddit, Forums)**:
STRICT RELEVANCE: Only score if discussion has CLEAR relevance to code search, developer tooling, agents, or context.
- **9-10**: Strong signal on code intelligence gaps, developer needs for agents/tooling/context/search
- **7-8**: Relevant discussion of developer tooling, AI adoption, or code management
- **5-6**: Developer discussion with CLEAR relevance to tooling or code intelligence (must apply to our focus)
- **0-4**: General developer content without connection to code tools, agents, or context
`,
    industry: `
**INDUSTRY & TECH NEWS (Hacker News, InfoQ, etc.)**:
STRICT RELEVANCE: Only score if news has DIRECT connection to code tooling, agents, context, or retrieval.
- **9-10**: Major innovation directly applicable to code intelligence, agents, or developer tooling
- **7-8**: Strong technical advance relevant to code tooling, agents, or context management
- **5-6**: Tech news with CLEAR relevance to code tools, retrieval, or agents (must apply to our focus)
- **0-4**: General tech news without connection to code tooling, agents, or context management
`,
    product: `
**PRODUCT UPDATES & CHANGELOGS (GitHub, OpenAI, Anthropic, etc.)**:
STRICT RELEVANCE: Must have DIRECT connection to code intelligence, agents, context, or developer tooling.
- **9-10**: Major feature for code intelligence, developer agents, or context/retrieval in coding
- **7-8**: Significant update relevant to code tooling, AI for developers, or context management
- **5-6**: Product update with CLEAR developer tooling relevance (must connect to code/agents/context)
- **0-4**: Generic product update unrelated to code tooling, agents, or context
`,
    competitive: `
**COMPETITIVE INTELLIGENCE**:
STRICT RELEVANCE: Must be about code intelligence, developer tooling, agents, or context management companies.
- **9-10**: Major funding/acquisition/launch in code intelligence, agents, or developer tooling
- **7-8**: Competitive move relevant to code intelligence or developer tools market
- **5-6**: Company news with CLEAR relevance to code tools or agents (must apply to our focus)
- **0-4**: General company news without code/tooling/agent relevance
`,
    ai_insights: `
**AI INSIGHTS & ARCHITECTURE**:
STRICT RELEVANCE: Only score if article has DIRECT connection to code/development tooling applications.
Must relate to: LLM architectures for code agents, context management for coding, reasoning for software engineering, retrieval for code.
- **9-10**: Breakthrough in LLM/agent architecture with CLEAR code tooling application
- **7-8**: Strong relevance to code agents, context management, or reasoning for development
- **5-6**: AI/LLM insight with CLEAR connection to code tooling (must apply to development)
- **0-4**: General AI/LLM content without connection to code tooling or development applications
`,
};

function extractOriginalUrlFromInoreader(item: KnowledgeItem): string | undefined {
    const url = (item as any).url || '';
    const content = (item as any).content || (item as any).summary || '';
    
    // If not an Inoreader blob, return the URL as-is
    if (!url.includes('inoreader.com/article/')) {
        return url;
    }
    
    // Try to extract original URL from content/summary
    // Common patterns in Inoreader content:
    // - HTML: <a href="...">original article</a>
    // - Text: "Read full article at: http://..."
    // - Meta: <meta property="og:url" content="...">
    
    // Try to find href patterns
    const hrefMatch = content.match(/href=['"]([^'"]+)['"]/);
    if (hrefMatch && hrefMatch[1] && hrefMatch[1].startsWith('http')) {
        return hrefMatch[1];
    }
    
    // Try to find URLs after "Read" or "Source"
    const sourceMatch = content.match(/(Read|Source|original|article).*?(https?:\/\/[^\s<>"]+)/i);
    if (sourceMatch && sourceMatch[2]) {
        return sourceMatch[2];
    }
    
    // Try to find any http URL in the content
    const urlMatch = content.match(/https?:\/\/[^\s<>"]+/);
    if (urlMatch && urlMatch[0]) {
        // Make sure it's not the Inoreader URL itself
        if (!urlMatch[0].includes('inoreader.com')) {
            return urlMatch[0];
        }
    }
    
    // Fallback: return the Inoreader URL
    return url;
}

function categorizeItemByFeed(item: KnowledgeItem): keyof typeof CATEGORY_CRITERIA {
    const feed = ((item as any).feedName || '').toLowerCase();
    const source = item.source;
    
    if (feed.includes('arxiv') || feed.includes('cs.ai') || feed.includes('cs.ir')) {
        return 'research';
    }
    if (feed.includes('tldr') || feed.includes('pragmatic') || feed.includes('byte byte') || 
        feed.includes('pointer') || feed.includes('architecture') || feed.includes('leadership')) {
        return 'newsletter';
    }
    if (feed.includes('reddit') || feed.includes('devops') || feed.includes('vibecoding')) {
        return 'community';
    }
    if (feed.includes('github') || feed.includes('changelog')) {
        return 'product';
    }
    // AI Insights: LLM Watch, AI Daily Brief, Made by Agents, Latent Space, a16z Podcast
    if (feed.includes('llm watch') || feed.includes('ai daily') || feed.includes('made by agents') || 
        feed.includes('latent space') || feed.includes('a16z')) {
        return 'ai_insights';
    }
    // Competitive: OpenAI News, Anthropic (Google News), Cursor, Codeium
    if (feed.includes('openai') || feed.includes('anthropic') || 
        feed.includes('cursor') || feed.includes('codeium') || 
        feed.includes('amp news')) {
        return 'competitive';
    }
    
    return 'industry';
}

export async function curateContent(items: KnowledgeItem[]): Promise<ScoredItem[]> {
    if (items.length === 0) return [];

    logger.info(`Curating ${items.length} items with LLM...`);

    // Group items by category before curation
    const itemsByCategory: Record<keyof typeof CATEGORY_CRITERIA, KnowledgeItem[]> = {
        research: [],
        newsletter: [],
        community: [],
        industry: [],
        product: [],
        competitive: [],
        ai_insights: [],
    };
    
    for (const item of items) {
        const category = categorizeItemByFeed(item);
        itemsByCategory[category].push(item);
    }
    
    logger.info(`Items by category BEFORE curation:`, JSON.stringify({
        research: itemsByCategory.research.length,
        newsletter: itemsByCategory.newsletter.length,
        community: itemsByCategory.community.length,
        industry: itemsByCategory.industry.length,
        product: itemsByCategory.product.length,
        competitive: itemsByCategory.competitive.length,
        ai_insights: itemsByCategory.ai_insights.length,
    }));

    // Batch items to avoid context limits (e.g., 10-15 items per batch)
    const BATCH_SIZE = 15;
    const results: ScoredItem[] = [];

    // Curate each category separately
    for (const [category, categoryItems] of Object.entries(itemsByCategory)) {
        if (categoryItems.length === 0) continue;
        
        const batches = [];
        for (let i = 0; i < categoryItems.length; i += BATCH_SIZE) {
            batches.push(categoryItems.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            const batchInput = batch.map(item => {
                // Try to extract original URL from Inoreader blobs
                const originalUrl = extractOriginalUrlFromInoreader(item);
                const url = (item as any).url || '';
                const isInoreaderBlob = url.includes('inoreader.com/article/');
                const couldNotExtract = isInoreaderBlob && originalUrl === url;
                
                return {
                    id: item.id,
                    title: item.title,
                    summary: item.source === 'ads' ? (item as any).abstract : (item as any).summary || (item as any).content?.slice(0, 500),
                    source: item.source,
                    feed: item.source === 'rss' ? (item as any).feedName : 'Academic Paper',
                    tags: (item as any).tags || [],
                    url: originalUrl,
                    note: couldNotExtract ? '[WARNING: Inoreader internal link - original URL could not be extracted]' : undefined
                };
            });

            try {
                const categoryCriteria = CATEGORY_CRITERIA[category as keyof typeof CATEGORY_CRITERIA] || '';
                const prompt = `
You are a **Relevance Judge** for a specialized market intelligence newsletter about **Code Intelligence & Developer Experience**.
Your job is to strictly filter and score content within its category based on the following criteria.

${categoryCriteria}

IMPORTANT: Items with "[WARNING: Inoreader internal link - may be inaccessible]" note are internal links that readers may not be able to access. Downgrade these by 1-2 points to deprioritize them, unless they have exceptionally high relevance.

Evaluate the following items.
Return a JSON object with a "ratings" array:
{
  "ratings": [
    { 
      "id": "string", 
      "score": number, 
      "reasoning": "string (concise justification, mention key relevance)" 
    }
  ]
}

Items to evaluate:
${JSON.stringify(batchInput, null, 2)}
`;

                const response = await generateCompletion(prompt, "Output ONLY valid JSON.");
                
                // robust parsing
                let parsed: any;
                try {
                    // Strip markdown code blocks if present
                    const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
                    parsed = JSON.parse(cleanJson);
                } catch (e) {
                    logger.warn("Failed to parse curation response JSON", { error: String(e), response });
                    continue;
                }

                if (parsed?.ratings && Array.isArray(parsed.ratings)) {
                    for (const rating of parsed.ratings) {
                        const original = batch.find(i => i.id === rating.id);
                        if (original) {
                            results.push({
                                id: original.id,
                                score: rating.score,
                                reasoning: rating.reasoning,
                                item: original
                            });
                        }
                    }
                }

            } catch (error) {
                logger.error("Error curating batch", { error: String(error) });
            }
        }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
}
