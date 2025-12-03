import { InoreaderClient } from '../inoreader/client.js';
import { store } from '../store/json-store.js';
import { ExternalArticle } from '../store/schema.js';
import { logger } from '../logger.js';
import { config } from '../../config.js';
import { classifyContent, calculateScore, FeedCategory } from './classifier.js';

export class InoreaderIngester {
  private client: InoreaderClient;

  constructor() {
    const clientId = config.INOREADER_CLIENT_ID;
    const clientSecret = config.INOREADER_CLIENT_SECRET;
    const refreshToken = config.INOREADER_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Inoreader credentials not found in environment variables');
    }

    this.client = new InoreaderClient({
      clientId,
      clientSecret,
      refreshToken,
    });
  }

  async sync(streamId: string = 'user/-/state/com.google/reading-list', limit: number = 50): Promise<number> {
    logger.info(`Starting Inoreader sync for stream: ${streamId}`);

    try {
      // We can fetch unread only or all. For now, let's fetch what's in the stream.
      // n: number of items
      const response = await this.client.getStreamContents(streamId, { n: limit });
      
      const articles: ExternalArticle[] = response.items.map(item => {
        // TLDR Specific Logic: The 'canonical' URL from Inoreader points to the newsletter issue, not the article.
        // We need to try and extract the first link from the content if it's a TLDR feed.
        // Or, if we can't, at least we know the limitation.
        // Actually, TLDR newsletter items often contain multiple stories. 
        // The Inoreader item title is "Story 1, Story 2, Story 3".
        // We should probably NOT treat a whole TLDR issue as a single article, but we can't easily split it without complex parsing.
        // However, if the user wants links, we should at least link to the web version of the newsletter issue (which is what we have).
        // Wait, the debug output shows URL: https://www.inoreader.com/article/3a9c6e76b2a58c51
        // This is an internal Inoreader link because TLDR might not provide a public link for the issue in the RSS metadata properly?
        // Or maybe Inoreader caches it.
        
        // Let's prefer the 'canonical' href if available, else alternate.
        let url = item.canonical?.[0]?.href || item.alternate?.[0]?.href || '';
        
        // If URL is an Inoreader internal link (starts with www.inoreader.com/article), it's not ideal but it's accessible if logged in?
        // Actually, for TLDR, the "alternate" link is usually the web view.
        // But if the RSS feed doesn't provide a link to the individual story, we are stuck with the issue link.
        
        // Classify the content
        const { contentType, tags } = classifyContent(item.title, item.summary?.content || '');
        
        // Parse Inoreader categories
        const inoreaderCategories = (item.categories || []);
        const inoreaderLabels = inoreaderCategories
            .filter(c => c.includes('/label/'))
            .map(c => c.split('/label/').pop() || '')
            .filter(l => l.length > 0);
            
        const isStarred = inoreaderCategories.some(c => c.endsWith('/starred'));
        
        // Merge Inoreader labels with our tags
        const allTags = [...new Set([...tags, ...inoreaderLabels])];
        
        // Determine source type based on feed name (heuristic) or Inoreader folder
        // This is basic; we could improve it with a domain map later
        let sourceType: FeedCategory = 'general';
        
        // Map common Inoreader folder names to Source Types if present
        const lowerLabels = inoreaderLabels.map(l => l.toLowerCase());
        if (lowerLabels.includes('competitors') || lowerLabels.includes('competition')) sourceType = 'competitor_blog';
        else if (lowerLabels.includes('engineering') || lowerLabels.includes('dev blogs')) sourceType = 'engineering_blog';
        else if (lowerLabels.includes('ai') || lowerLabels.includes('research')) sourceType = 'curated_ai';
        else {
            // Fallback to title heuristic
            const feedTitleLower = (item.origin?.title || '').toLowerCase();
            if (feedTitleLower.includes('blog') || feedTitleLower.includes('engineering')) sourceType = 'engineering_blog';
            if (feedTitleLower.includes('platform')) sourceType = 'platform_blog';
        }
        
        const article: ExternalArticle = {
          id: item.id, 
          title: item.title,
          url: url,
          content: item.summary?.content || '',
          summary: item.summary?.content ? this.stripHtml(item.summary.content).substring(0, 500) : '',
          publishedAt: new Date(item.published * 1000).toISOString(),
          author: item.author,
          source: 'rss', 
          feedName: item.origin?.title || 'Inoreader',
          ingestedAt: new Date().toISOString(),
          tags: allTags,
          sourceType: sourceType, 
          contentType: contentType,
        };

        // Skip excluded feeds
        // TLDR is NO LONGER skipped because we want it for Newsletter Highlights
        if (article.feedName === 'The Practical Developer') {
             return null;
        }

        // Calculate relevance score
        // Boost score if starred in Inoreader
        article.score = calculateScore(article, sourceType, contentType, allTags) + (isStarred ? 5 : 0);
        
        return article;
      }).filter((a): a is ExternalArticle => a !== null);

      if (articles.length > 0) {
        await store.init();
        await store.addArticles(articles);
        logger.info(`Synced ${articles.length} articles from Inoreader`);
      } else {
        logger.info('No articles found in Inoreader stream');
      }

      return articles.length;
    } catch (error) {
      logger.error('Failed to sync Inoreader', error);
      throw error;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '');
  }
}
