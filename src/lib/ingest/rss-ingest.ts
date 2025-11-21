import Parser from 'rss-parser';
import { store } from '../store/json-store.js';
import { ExternalArticle } from '../store/schema.js';
import crypto from 'crypto';
import { logger } from '../logger.js';
import { config } from '../../config.js';
import { scrapeAugmentCode, scrapeGreptile, scrapeQodo } from './scraper.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'ResearchAgent/1.0'
  }
});

type FeedCategory = 'competitor_blog' | 'platform_blog' | 'infra_blog' | 'curated_ai';

interface FeedConfig {
    name: string;
    url: string;
    category: FeedCategory;
    company?: string;
    type?: 'rss' | 'scraper';
    scraperFn?: () => Promise<any[]>;
}

const RSS_FEEDS: FeedConfig[] = [
    // A. Direct Competitors
    { 
        name: 'Augment Code', 
        url: 'https://www.augmentcode.com/blog', 
        category: 'competitor_blog', 
        company: 'Augment Code',
        type: 'scraper',
        scraperFn: scrapeAugmentCode
    },
    { 
        name: 'Greptile', 
        url: 'https://www.greptile.com/blog', 
        category: 'competitor_blog', 
        company: 'Greptile',
        type: 'scraper',
        scraperFn: scrapeGreptile
    },
    { 
        name: 'CodeRabbit', 
        url: 'https://www.coderabbit.ai/feed', 
        category: 'competitor_blog', 
        company: 'CodeRabbit' 
    },
    { 
        name: 'Qodo', 
        url: 'https://www.qodo.ai/blog/', 
        category: 'competitor_blog', 
        company: 'Qodo',
        type: 'scraper',
        scraperFn: scrapeQodo
    },
    { name: 'Hornet', url: 'https://blog.hornet.dev/rss.xml', category: 'competitor_blog', company: 'Hornet' },
    
    // B. Platform + Ecosystem DevTools
    { name: 'GitHub Blog', url: 'http://github.com/blog.atom', category: 'platform_blog', company: 'GitHub' },
    { name: 'GitLab Blog', url: 'https://about.gitlab.com/atom.xml', category: 'platform_blog', company: 'GitLab' },
    { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', category: 'platform_blog', company: 'OpenAI' },
    { name: 'LangChain Blog', url: 'https://blog.langchain.dev/rss/', category: 'platform_blog', company: 'LangChain' },
    { name: 'LlamaIndex Blog', url: 'https://www.llamaindex.ai/blog/rss.xml', category: 'platform_blog', company: 'LlamaIndex' },
    { name: 'Pinecone Blog', url: 'https://www.pinecone.io/feed.xml', category: 'platform_blog', company: 'Pinecone' },
    { name: 'Anthropic Research', url: 'https://www.anthropic.com/index.xml', category: 'platform_blog', company: 'Anthropic' },
    { name: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/rss.xml', category: 'platform_blog', company: 'Google' },
    { name: 'AWS Machine Learning', url: 'https://aws.amazon.com/blogs/machine-learning/feed/', category: 'platform_blog', company: 'AWS' },
    { name: 'Microsoft Research', url: 'https://www.microsoft.com/en-us/research/feed/', category: 'platform_blog', company: 'Microsoft' },

    // C. Retrieval / RAG Infra / Tooling (Infra Competitors/Dependencies)
    { name: 'Weaviate Blog', url: 'https://weaviate.io/blog/rss.xml', category: 'infra_blog', company: 'Weaviate' },
    { name: 'Qdrant Blog', url: 'https://qdrant.tech/blog/rss.xml', category: 'infra_blog', company: 'Qdrant' }, // Guessing
    { name: 'Elasticsearch Blog', url: 'https://www.elastic.co/blog/feed', category: 'infra_blog', company: 'Elastic' },
    { name: 'Supabase Blog', url: 'https://supabase.com/blog/rss.xml', category: 'infra_blog', company: 'Supabase' },

    // D. Curated AI/ML + DevTools RSS Bundles
    { name: 'Hacker News', url: 'https://news.ycombinator.com/rss', category: 'curated_ai' },
    { name: 'Lobste.rs', url: 'https://lobste.rs/rss', category: 'curated_ai' },
];

// 3. Classification Configuration

type ContentType = 'product_launch' | 'feature_update' | 'pricing_business' | 'security_incident' | 'funding_mna' | 'benchmark_eval' | 'thought_leadership' | 'general';

const KEYWORD_HEURISTICS: Record<Exclude<ContentType, 'general'>, string[]> = {
    product_launch: ['launch', 'introducing', 'announcing', 'now ga', 'public preview', 'beta', 'generally available', 'now available', 'released'],
    feature_update: ['new integration', 'support for', 'now supports', 'mcp', 'langgraph', 'agents', 'multi-repo', 'context window', 'code graph', 'self-hosted', 'update'],
    pricing_business: ['pricing', 'plans', 'credits', 'free tier', 'enterprise', 'seat', 'per-user', 'license', 'billing', 'usage based'],
    security_incident: ['security', 'vulnerability', 'cve-', 'incident', 'breach', 'exploit', 'rce', 'supply chain', 'security advisory'],
    funding_mna: ['raises', 'series a', 'series b', 'seed round', 'acquired', 'acquisition', 'joins', 'merger'],
    benchmark_eval: ['benchmark', 'throughput', 'latency', 'tokens/sec', 'quality evaluation', 'win-rate', 'comparison', 'beat', 'outperforms'],
    thought_leadership: ['future of', 'why x matters', 'guide to', 'best practices', 'lessons learned', 'deep dive']
};

const DOMAIN_TAGS_MAPPING: Record<string, string[]> = {
    code_review: ['pr', 'pull request', 'merge request', 'code review', 'review agent'],
    documentation: ['documentation', 'docs', 'docstrings', 'api reference'],
    retrieval: ['rag', 'retrieval', 'vector', 'embedding', 'index', 'pinecone', 'weaviate', 'qdrant'],
    agents: ['agent', 'agentic', 'langgraph', 'mcp', 'autonomous'],
    ide: ['ide', 'vscode', 'jetbrains', 'editor', 'plugin', 'extension'],
    testing: ['testing', 'unit test', 'integration test', 'test coverage'],
    observability: ['observability', 'monitoring', 'tracing', 'metrics'],
    governance: ['governance', 'compliance', 'audit', 'policy'],
};

// 4. Scoring Configuration

const WEIGHTS = {
    source_type: {
        competitor_blog: 3,
        platform_blog: 2,
        infra_blog: 1.5,
        curated_ai: 1,
        general: 0.5
    },
    content_type: {
        product_launch: 4,
        security_incident: 4,
        feature_update: 3,
        pricing_business: 3,
        funding_mna: 3,
        benchmark_eval: 2,
        thought_leadership: 0.5,
        general: 1
    },
    axis: {
        code_review: 3,
        context_engine: 3,
        documentation: 2,
        agents: 2,
        governance: 2,
        retrieval: 1.5,
        testing: 1.5,
        vector_db: 1,
        ide: 1,
        observability: 1
    }
};

const KEYWORD_BOOSTS: { patterns: string[], boost: number }[] = [
    { patterns: ['launch', 'announcing', 'now ga', 'public preview', 'beta', 'integration', 'mcp', 'agents', 'langgraph', 'self-hosted', 'on-prem', 'air-gapped'], boost: 3 },
    { patterns: ['context window', 'code graph', 'multi-repo', 'governance', 'sdlc', 'sast', 'compliance', 'policy', 'test coverage'], boost: 2 },
    { patterns: ['pricing', 'credits', 'seat', 'per-user', 'enterprise', 'unlimited'], boost: 2 },
    { patterns: ['security', 'vulnerability', 'cve-', 'data exfiltration', 'prompt injection'], boost: 2 }
];

// Hard filters
const EXCLUDE_KEYWORDS = [
  "cryptocurrency", "crypto", "bitcoin", "nft", "web3", "blockchain", 
  "gaming", "consumer apps", "video game", "esports"
];

const CORE_CONCEPTS = [
    'code review', 'software supply chain', 'context window', 'vector database', 'rag', 'agents', 
    'ide', 'repository', 'pull request', 'documentation', 'llm', 'copilot', 'ai engineering'
];

const MAX_AGE_DAYS = 14; // Recency decay window

// Helper Functions

function classifyArticle(title: string, content: string): { contentType: ContentType, tags: string[] } {
    const text = `${title} ${content}`.toLowerCase();
    
    // 1. Content Type
    let primaryType: ContentType = 'general';
    // Check in priority order? Or just first match? Or score matches?
    // Let's iterate and pick the one with most matches, or just first match based on the list order (which implies priority if we structured it that way, but object keys aren't ordered reliably).
    // We'll prioritize explicit types.
    
    for (const [type, keywords] of Object.entries(KEYWORD_HEURISTICS)) {
        if (keywords.some(kw => text.includes(kw))) {
            primaryType = type as ContentType;
            break; // Stop at first match for simplicity, or logic could be more complex
        }
    }
    
    if (primaryType === 'general' && (text.includes('how to') || text.includes('tutorial'))) {
        primaryType = 'thought_leadership';
    }

    // 2. Domain Tags (Axis)
    const tags: string[] = [];
    for (const [tag, keywords] of Object.entries(DOMAIN_TAGS_MAPPING)) {
        if (keywords.some(kw => text.includes(kw))) {
            tags.push(tag);
        }
    }

    return { contentType: primaryType, tags };
}

function calculateScore(
    article: ExternalArticle, 
    category: FeedCategory, 
    contentType: ContentType, 
    tags: string[]
): number {
    let score = 0;
    
    // Base weights
    score += WEIGHTS.source_type[category] || 1;
    score += WEIGHTS.content_type[contentType] || 1;
    
    for (const tag of tags) {
        // Need to map tag strings to weight keys if they differ, but here they look consistent
        // DOMAIN_TAGS_MAPPING keys are like 'code_review', WEIGHTS.axis keys are 'code_review'
        // However, 'retrieval' maps to 1.5, etc.
        const w = (WEIGHTS.axis as any)[tag] || 0;
        score += w;
    }
    
    // Keyword Boosts
    const text = `${article.title} ${article.summary || ''}`.toLowerCase();
    for (const group of KEYWORD_BOOSTS) {
        if (group.patterns.some(p => text.includes(p))) {
            score += group.boost;
        }
    }
    
    // Recency Decay
    if (article.publishedAt) {
        const published = new Date(article.publishedAt);
        const ageDays = (Date.now() - published.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > 0) {
            const decay = Math.exp(-ageDays / 14);
            score *= decay;
        }
    }
    
    return score;
}

function shouldIngest(item: any, feedConfig: FeedConfig): boolean {
    const title = (item.title || '').toLowerCase();
    const content = (item.contentSnippet || item.content || '').toLowerCase();
    const text = `${title} ${content}`;

    // 1. Time Filter
    if (item.isoDate) {
        const date = new Date(item.isoDate);
        const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > MAX_AGE_DAYS) return false;
    }

    // 2. Exclusion Filter
    if (EXCLUDE_KEYWORDS.some(kw => text.includes(kw))) return false;

    // 3. Curated Feed Noise Filter
    if (feedConfig.category === 'curated_ai') {
        // Must mention competitor or core concept
        const companyMatch = RSS_FEEDS.filter(f => f.company).some(f => text.includes(f.company!.toLowerCase()));
        const conceptMatch = CORE_CONCEPTS.some(c => text.includes(c));
        
        if (!companyMatch && !conceptMatch) return false;
    }
    
    // 4. Thought Leadership Filter
    // Drop thought_leadership if no product change AND no security/governance axis
    // We need to classify first to know this? 
    // Ideally we ingest then filter, but the prompt says "Hard filters to discard noise... Apply before scoring".
    // So we can run a lightweight check here or just do it.
    
    return true;
}

function isTransientError(error: unknown): boolean {
    const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return (
        msg.includes('econnreset') || 
        msg.includes('etimedout') || 
        msg.includes('timeout') ||
        msg.includes('network error') || 
        msg.includes('status code 429') || 
        msg.includes('status code 500') || 
        msg.includes('status code 502') || 
        msg.includes('status code 503')
    );
}

async function fetchFeedWithRetry(url: string, feedName: string, retryCount = 0): Promise<any> {
    const MAX_RETRIES = config.API_MAX_RETRIES || 3;
    const INITIAL_DELAY_MS = config.API_RETRY_DELAY || 1000;

    try {
        return await parser.parseURL(url);
    } catch (error) {
        if (isTransientError(error) && retryCount < MAX_RETRIES) {
            const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
            logger.warn(`RSS fetch failed for ${feedName}. Retrying in ${delay}ms...`, { error: String(error) });
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchFeedWithRetry(url, feedName, retryCount + 1);
        }
        throw error;
    }
}

export async function ingestRssFeeds() {
    logger.info('Starting RSS ingestion with enhanced classification...');
    await store.init();

    const newArticles: ExternalArticle[] = [];
    const existingUrls = new Set(store.getAllArticles().map(a => a.url));
    let skippedCount = 0;

    const CONCURRENCY_LIMIT = 10;
    
    // Simple concurrency limiter
    const runWithLimit = async <T>(items: any[], limit: number, fn: (item: any) => Promise<T>): Promise<T[]> => {
        const results: Promise<T>[] = [];
        const executing: Promise<void>[] = [];
        
        for (const item of items) {
            const p = fn(item);
            results.push(p);
            
            const e: Promise<void> = p.then(() => {
                const index = executing.indexOf(e);
                if (index > -1) {
                    executing.splice(index, 1);
                }
            });
            executing.push(e);
            
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
        return Promise.all(results);
    };

    await runWithLimit(RSS_FEEDS, CONCURRENCY_LIMIT, async (feed) => {
        try {
            logger.info(`Fetching feed: ${feed.name}`);
            let items: any[] = [];

            if (feed.type === 'scraper' && feed.scraperFn) {
                const scrapedItems = await feed.scraperFn();
                items = scrapedItems.map((item: any) => ({
                    title: item.title,
                    link: item.url,
                    contentSnippet: item.contentSnippet,
                    content: item.contentSnippet,
                    isoDate: item.isoDate,
                    creator: item.author
                }));
            } else {
                const result = await fetchFeedWithRetry(feed.url, feed.name);
                items = result.items || [];
            }

            const feedArticles: ExternalArticle[] = [];

            for (const item of items) {
                if (!item.link) continue;

                if (existingUrls.has(item.link)) {
                    skippedCount++;
                    continue;
                }

                if (!shouldIngest(item, feed)) {
                    skippedCount++;
                    continue;
                }

                // Classification
                const { contentType, tags } = classifyArticle(item.title || '', item.contentSnippet || item.content || '');
                
                // Additional filter for Thought Leadership without substance
                if (contentType === 'thought_leadership' && 
                    !tags.includes('security_incident') && 
                    !tags.includes('governance') &&
                    feed.category === 'curated_ai') {
                    if (feed.category === 'curated_ai') {
                            skippedCount++;
                            continue;
                    }
                }

                const id = crypto.createHash('md5').update(item.link || item.title || '').digest('hex');
                
                // Partial article construction to calculate score
                const tempArticle: ExternalArticle = {
                    id,
                    title: item.title || 'Untitled',
                    url: item.link,
                    content: item.content || item.contentSnippet,
                    summary: item.contentSnippet,
                    publishedAt: item.isoDate || new Date().toISOString(),
                    author: item.creator || item.author,
                    source: 'rss',
                    feedName: feed.name,
                    sourceType: feed.category,
                    company: feed.company,
                    contentType,
                    tags,
                    ingestedAt: new Date().toISOString(),
                };

                const score = calculateScore(tempArticle, feed.category, contentType, tags);
                
                // Final article
                const article: ExternalArticle = {
                    ...tempArticle,
                    score
                };

                feedArticles.push(article);
                existingUrls.add(article.url);
            }
            
            if (feedArticles.length > 0) {
                newArticles.push(...feedArticles);
            }

        } catch (error) {
                logger.error(`Failed to fetch feed ${feed.name}:`, { error: String(error) });
        }
    });

    // Batch save at the end to reduce IO, or we could save incrementally.
    // Saving all at once is safer for JSON integrity but might be memory heavy if 1000s of articles.
    // Given the scale (RSS), it's fine.
    if (newArticles.length > 0) {
        await store.addArticles(newArticles);
        logger.info(`Saved ${newArticles.length} articles.`);
    }

    logger.info(`Ingestion complete. Fetched ${newArticles.length} new articles. Skipped ${skippedCount}.`);
}
