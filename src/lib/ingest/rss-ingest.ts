import Parser from 'rss-parser';
import { store } from '../store/json-store.js';
import { ExternalArticle } from '../store/schema.js';
import crypto from 'crypto';
import { logger } from '../logger.js';
import { config } from '../../config.js';
import { scrapeAugmentCode, scrapeGreptile, scrapeQodo, scrapeTLDR, scrapeProgrammingDigest } from './scraper.js';
import { classifyContent, calculateScore, FeedCategory } from './classifier.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'ResearchAgent/1.0'
  }
});

interface FeedConfig {
    name: string;
    url: string;
    category: FeedCategory;
    company?: string;
    type?: 'rss' | 'scraper';
    scraperFn?: () => Promise<any[]>;
}

const RSS_FEEDS: FeedConfig[] = [
// ... (Feed list is long, I should keep it but remove the constants after it)
    // A. Direct Competitors (AI Coding Agents)
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
    { name: 'Sourcegraph', url: 'https://sourcegraph.com/blog/rss.xml', category: 'competitor_blog', company: 'Sourcegraph' },
    { name: 'JetBrains AI', url: 'https://blog.jetbrains.com/ai/feed/', category: 'competitor_blog', company: 'JetBrains' },
    
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

    // C. Retrieval / RAG Infra / Tooling
    { name: 'Weaviate Blog', url: 'https://weaviate.io/blog/rss.xml', category: 'infra_blog', company: 'Weaviate' },
    { name: 'Qdrant Blog', url: 'https://qdrant.tech/blog/rss.xml', category: 'infra_blog', company: 'Qdrant' }, 
    { name: 'Elasticsearch Blog', url: 'https://www.elastic.co/blog/feed', category: 'infra_blog', company: 'Elastic' }, // Main blog
    { name: 'Elastic Search Labs', url: 'https://www.elastic.co/search-labs/rss/feed', category: 'infra_blog', company: 'Elastic' }, // Technical/RAG specific
    { name: 'Supabase Blog', url: 'https://supabase.com/blog/rss.xml', category: 'infra_blog', company: 'Supabase' },
    { name: 'Vespa Blog', url: 'https://blog.vespa.ai/feed.xml', category: 'infra_blog', company: 'Vespa' },

    // D. AI Engineering & Thought Leadership (High Signal)
    { name: 'Latent Space', url: 'https://latent.space/feed', category: 'engineering_blog' },
    { name: 'Eugene Yan', url: 'https://eugeneyan.com/rss/', category: 'engineering_blog', company: 'Eugene Yan' },
    { name: 'Chip Huyen', url: 'https://huyenchip.com/feed.xml', category: 'engineering_blog', company: 'Chip Huyen' },
    // { name: 'Towards AI', url: 'https://pub.towardsai.net/feed', category: 'engineering_blog' }, // Cloudflare blocked
    { name: 'DataScienceDojo', url: 'https://datasciencedojo.com/blog/feed/', category: 'engineering_blog' },

    // E. Curated AI/ML + DevTools RSS Bundles
    { name: 'Hacker News', url: 'https://news.ycombinator.com/rss', category: 'curated_ai' },
    { name: 'Lobste.rs', url: 'https://lobste.rs/rss', category: 'curated_ai' },
    
    // F. Newsletters
    { name: 'Pragmatic Engineer', url: 'https://newsletter.pragmaticengineer.com/feed', category: 'curated_ai', company: 'Pragmatic Engineer' },
    { 
        name: 'TLDR Tech', 
        url: 'https://tldr.tech/tech/archives', 
        category: 'curated_ai',
        type: 'scraper',
        scraperFn: scrapeTLDR 
    },
    {
        name: 'Programming Digest',
        url: 'https://programmingdigest.net/newsletters',
        category: 'curated_ai',
        type: 'scraper',
        scraperFn: scrapeProgrammingDigest
    }
];

// 3. Classification Configuration
// (Moved to classifier.ts)

// Hard filters
const EXCLUDE_KEYWORDS = [
  "cryptocurrency", "crypto", "bitcoin", "nft", "web3", "blockchain", 
  "gaming", "consumer apps", "video game", "esports"
];

const CORE_CONCEPTS = [
    'code review', 'software supply chain', 'context window', 'vector database', 'rag', 'agents', 
    'ide', 'repository', 'pull request', 'documentation', 'llm', 'copilot', 'ai engineering'
];

const MAX_AGE_DAYS = 90; // Increased window for engineering blogs

// Helper Functions

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
                const { contentType, tags } = classifyContent(item.title || '', item.contentSnippet || item.content || '');
                
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
