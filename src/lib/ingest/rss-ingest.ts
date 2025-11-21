import Parser from 'rss-parser';
import { store } from '../store/json-store.js';
import { ExternalArticle } from '../store/schema.js';
import crypto from 'crypto';
import { logger } from '../logger.js';
import { config } from '../../config.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'ResearchAgent/1.0'
  }
});

// Configuration for RSS feeds
const RSS_FEEDS = [
  // Core Industry Research
  { name: 'OpenAI Research', url: 'https://openai.com/blog/rss.xml' },
  { name: 'Anthropic Research', url: 'https://www.anthropic.com/index.xml' }, // Often index.xml for Hugo/Jekyll sites
  { name: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/rss.xml' },
  { name: 'Microsoft Research', url: 'https://www.microsoft.com/en-us/research/feed/' },
  { name: 'NVIDIA Technical Blog', url: 'https://developer.nvidia.com/blog/feed' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml' },
  
  // ML Systems & Search
  { name: 'Pinecone Blog', url: 'https://www.pinecone.io/feed.xml' },
  { name: 'Weaviate Blog', url: 'https://weaviate.io/blog/rss.xml' },
  { name: 'Elasticsearch Blog', url: 'https://www.elastic.co/blog/feed' },
  
  // Knowledge & Agents
  { name: 'LlamaIndex Blog', url: 'https://www.llamaindex.ai/blog/rss.xml' },
  { name: 'LangChain Blog', url: 'https://blog.langchain.dev/rss/' },
  
  // Engineering Blogs
  { name: 'Netflix Tech Blog', url: 'https://netflixtechblog.com/feed' },
  { name: 'Uber Engineering', url: 'https://www.uber.com/en-US/blog/engineering/rss/' },
  { name: 'GitHub Engineering', url: 'https://github.blog/category/engineering/feed/' },
  { name: 'GitLab Engineering', url: 'https://about.gitlab.com/atom.xml' }, // Main feed often includes engineering
  { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/' },
  
  // Aggregators
  { name: 'Hacker News', url: 'https://news.ycombinator.com/rss' },
  { name: 'Lobste.rs', url: 'https://lobste.rs/rss' },
];

// Smart Filters Configuration
const MAX_AGE_DAYS = 30; // Only keep last 30 days
const MIN_TITLE_LENGTH = 10;

const KEYWORDS_INCLUDE = [
  "code search", "source code retrieval", "semantic search", "RAG", "reranker", 
  "embeddings", "developer productivity", "IDE", "LLM agents", "context retrieval", 
  "prompting", "chunking", "indexing", "repo maps", "static analysis", 
  "symbol graph", "embeddings service", "vector search", "agentic", "transformer",
  "code generation", "retrieval augmented", "neural search", "language model"
];

const KEYWORDS_EXCLUDE = [
  "cryptocurrency", "crypto", "bitcoin", "nft", "web3", "blockchain", 
  "gaming", "consumer apps", "video game", "esports"
];

// Feeds that require strict keyword matching (high volume/noise)
const HIGH_VOLUME_FEEDS = ['Hacker News', 'Lobste.rs', 'Reddit'];

function shouldIngest(item: any, feedName: string): boolean {
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
  if (KEYWORDS_EXCLUDE.some(kw => text.includes(kw))) return false;

  // 3. Inclusion/Quality Filter
  // For high volume feeds, we REQUIRE a relevant keyword
  if (HIGH_VOLUME_FEEDS.includes(feedName)) {
    return KEYWORDS_INCLUDE.some(kw => text.includes(kw));
  }

  // For curated engineering blogs, we assume high signal, but still filter out blatant noise
  // (The exclusion filter above handles the worst offenders)
  return true;
}

function isTransientError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  
  // Check for common network error codes/messages
  if (
    msg.includes('econnreset') || 
    msg.includes('etimedout') || 
    msg.includes('eai_again') || 
    msg.includes('timeout') ||
    msg.includes('socket hang up') ||
    msg.includes('network error')
  ) {
    return true;
  }

  // Check for HTTP status codes in message if they bubble up
  if (
    msg.includes('status code 429') || 
    msg.includes('status code 500') || 
    msg.includes('status code 502') || 
    msg.includes('status code 503') || 
    msg.includes('status code 504')
  ) {
    return true;
  }

  return false;
}

async function fetchFeedWithRetry(url: string, feedName: string, retryCount = 0): Promise<any> {
  const MAX_RETRIES = config.API_MAX_RETRIES;
  const INITIAL_DELAY_MS = config.API_RETRY_DELAY;

  try {
    return await parser.parseURL(url);
  } catch (error) {
    if (isTransientError(error) && retryCount < MAX_RETRIES) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
      logger.warn(`RSS fetch failed for ${feedName}. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchFeedWithRetry(url, feedName, retryCount + 1);
    }
    throw error;
  }
}

export async function ingestRssFeeds() {
  logger.info('Starting RSS ingestion with smart filters...');
  await store.init();
  
  const newArticles: ExternalArticle[] = [];
  const existingUrls = new Set(store.getAllArticles().map(a => a.url));
  let skippedCount = 0;

  // Process feeds in parallel batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < RSS_FEEDS.length; i += BATCH_SIZE) {
      const batch = RSS_FEEDS.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (feed) => {
        logger.info(`Fetching feed: ${feed.name} (${feed.url})`);
        try {
          const result = await fetchFeedWithRetry(feed.url, feed.name);
          
          for (const item of result.items) {
            if (!item.link) continue;
            
            // 0. Deduping check (sync access to Set is fine in JS single thread loop)
            if (existingUrls.has(item.link)) {
              skippedCount++;
              continue;
            }

            // Apply Smart Filters
            if (!shouldIngest(item, feed.name)) {
                skippedCount++;
                continue;
            }

            // Create a stable ID based on URL
            const id = crypto.createHash('md5').update(item.link || item.title || '').digest('hex');
            
            const article: ExternalArticle = {
              id,
              title: item.title || 'Untitled',
              url: item.link,
              content: item.content || item.contentSnippet,
              summary: item.contentSnippet,
              publishedAt: item.isoDate || new Date().toISOString(),
              author: item.creator || item.author,
              source: 'rss',
              feedName: feed.name,
              ingestedAt: new Date().toISOString(),
              tags: item.categories
            };

            newArticles.push(article);
            existingUrls.add(article.url);
          }
        } catch (error) {
          logger.error(`Failed to fetch feed ${feed.name}:`, { error: error instanceof Error ? error.message : String(error) });
        }
      }));
  }

  logger.info(`Fetched ${newArticles.length} NEW relevant articles from RSS.`);
  logger.info(`Skipped ${skippedCount} articles (duplicate, too old, or irrelevant).`);
  
  // Save to store
  await store.addArticles(newArticles);
  logger.info('RSS ingestion complete.');
}
