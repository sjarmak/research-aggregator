import { logger } from "../logger.js";
import { config } from "../../config.js";
import { store } from "../store/json-store.js";
import { generateCompletion } from "../llm/client.js";
import { curateContent } from "./curator.js";
import { getFeedMetadata } from "./feed-metadata.js";

export async function generateNewsletter(days: number = 7): Promise<string> {
    await store.init();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // STRICT FILTER: Only accept content ingested from Inoreader (RSS)
    // We ignore 'ads' (SciX) unless it somehow came via Inoreader (unlikely)
    // We also filter out excluded feeds here just in case.
    // NOTE: TLDR is NOT excluded - we want newsletter content, just with relaxed thresholds
    const EXCLUDED_FEEDS = ['The Practical Developer'];

    const candidates = store.getAllArticles().filter(a => {
        // 1. Date Filter
        const date = a.publishedAt || a.ingestedAt;
        const pubDate = new Date(date);
        const isRecent = !isNaN(pubDate.getTime()) && pubDate >= cutoff;
        if (!isRecent) return false;

        // 2. Source Filter (Must be RSS/Inoreader)
        if (a.source !== 'rss') return false;

        // 3. Excluded Feeds
        if ((a as any).feedName && EXCLUDED_FEEDS.some(f => (a as any).feedName.includes(f))) return false;

        // 4. URL filter for internal blobs (though we want to keep valid content)
        if (a.url && a.url.includes('inoreader.com/article/')) {
            // Only exclude if we can't get real content, but for now let's try to keep high quality ones
            // Actually, user said "ignore low-quality blobs".
            // Often internal links are fine if the content summary is good.
            // We'll let the curator judge the content quality.
        }
        
        return true;
    });

    // Log pre-curation breakdown by source
    const sourceCounts: Record<string, number> = {};
    candidates.forEach(c => {
        const feed = (c as any).feedName || 'Unknown';
        sourceCounts[feed] = (sourceCounts[feed] || 0) + 1;
    });

    logger.info(`Found ${candidates.length} recent candidates from Inoreader. Starting LLM curation...`);
    logger.info(`Breakdown by source (pre-curation): ${JSON.stringify(sourceCounts, null, 2)}`);

    // 2. LLM Curation & Scoring
    const curatedItems = await curateContent(candidates);

    if (curatedItems.length === 0) {
         return `No content found in the last ${days} days.`;
    }

    // 3. Bucket BEFORE filtering by score
    // This allows us to apply different thresholds per bucket type
    const allItems = curatedItems.sort((a, b) => b.score - a.score);

    const buckets = {
        research: [] as typeof allItems,
        competitive: [] as typeof allItems,
        industry: [] as typeof allItems,
        community: [] as typeof allItems,
        newsletter: [] as typeof allItems,
        ai_insights: [] as typeof allItems,
        product_updates: [] as typeof allItems,
    };

    // COMPETITORS and INTERNAL exclusions
    // Note: For internal consumption, exclude Sourcegraph and related projects (Amp, etc.)
    const INTERNAL_EXCLUSIONS = ['sourcegraph', 'amp', 'cody'];
    const COMPETITORS = ['codeium', 'coderabbit', 'cursor', 'augment', 'bloop', 'continue', 'nuance', 'hornet'];

    // Helper to normalize titles for similarity matching (fuzzy deduplication)
    const normalizeTitle = (title: string): string => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .trim();
    };

    // Helper to calculate simple string similarity (Jaccard similarity on words)
    const calculateSimilarity = (str1: string, str2: string): number => {
        const words1 = new Set(normalizeTitle(str1).split(/\s+/));
        const words2 = new Set(normalizeTitle(str2).split(/\s+/));
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    };

    // Track seen items to deduplicate by title similarity (for syndicated stories)
    const deduplicatedItems: typeof allItems = [];
    const duplicatesLog: Array<{title: string; similarity: number; kept: boolean}> = [];
    const SIMILARITY_THRESHOLD = 0.6; // 60% title overlap = likely same story
    
    for (const currentItem of allItems) {
        const currentTitle = currentItem.item.title || '';
        
        // Check if this is a duplicate of something we've already seen
        let isDuplicate = false;
        for (const seenItem of deduplicatedItems) {
            const similarity = calculateSimilarity(currentTitle, seenItem.item.title || '');
            if (similarity >= SIMILARITY_THRESHOLD) {
                // Keep the higher-scored item, discard the duplicate
                if (currentItem.score > seenItem.score) {
                    // Remove the previously added item and add this one instead
                    const idx = deduplicatedItems.indexOf(seenItem);
                    deduplicatedItems.splice(idx, 1);
                    isDuplicate = false;
                } else {
                    isDuplicate = true;
                }
                duplicatesLog.push({ title: currentTitle, similarity, kept: !isDuplicate });
                break;
            }
        }
        
        if (!isDuplicate) {
            deduplicatedItems.push(currentItem);
        }
    }

    if (duplicatesLog.length > 0) {
        logger.info(`Deduplication found ${duplicatesLog.length} similar stories (threshold: ${SIMILARITY_THRESHOLD}):`, 
            JSON.stringify(duplicatesLog.slice(0, 5)));
    }
    
    logger.info(`Deduplicated ${allItems.length} items down to ${deduplicatedItems.length} (removed ${allItems.length - deduplicatedItems.length} redundant items)`);

    // First pass: bucket all items using feed metadata + pattern matching
    for (const item of deduplicatedItems) {
        const feedName = (item.item as any).feedName || '';
        const feed = feedName.toLowerCase();
        const url = item.item.url?.toLowerCase() || '';
        const title = item.item.title?.toLowerCase() || '';
        
        // Skip internal Sourcegraph-related content (for internal consumption)
        if (INTERNAL_EXCLUSIONS.some(ex => title.includes(ex) || feed.includes(ex))) {
            continue;
        }
        
        // Check feed metadata first
        const metadata = getFeedMetadata(feedName);
        
        // 1. Research (Arxiv)
        if (feed.includes('arxiv') || feed.includes('cs.ai') || feed.includes('cs.ir') || url.includes('arxiv.org') || url.includes('aclweb.org')) {
            buckets.research.push(item);
            continue;
        }

        // 2. Developer Newsletters (TLDR, Byte Byte Go, Pragmatic Engineer, etc.)
        if (metadata?.newsCategory === 'developer_newsletters') {
            buckets.newsletter.push(item);
            continue;
        }

        // 3. Community Updates (Reddit)
        if (metadata?.newsCategory === 'developer_communities' || url.includes('reddit.com') || feed.includes('reddit')) {
            buckets.community.push(item);
            continue;
        }

        // 4. AI Insights (AI Daily Brief, LLM Watch, etc.)
        if (metadata?.newsCategory === 'ai_articles') {
            buckets.ai_insights.push(item);
            continue;
        }

        // 5. Product Updates & Changelogs (GitHub, OpenAI, Anthropic, Cursor, Amp, etc.)
        if (metadata?.newsCategory === 'coding_product_updates') {
            buckets.product_updates.push(item);
            continue;
        }

        // 6. Competitive Intel
        // Check title or tags for competitor names
        const isCompetitor = COMPETITORS.some(c => 
            title.includes(c) || 
            feed.includes(c) || 
            (item.item.tags || []).some(t => t.toLowerCase().includes(c))
        );

        if (isCompetitor) {
            buckets.competitive.push(item);
            continue;
        }

        // 7. Industry Updates (Everything else)
        buckets.industry.push(item);
    }

    // Second pass: apply different thresholds per bucket type
    // Strict: Research (7+), Competitive (7+), Industry (7+)
    // Relaxed: Community (5+), Newsletter (5+), AI Insights (5+), Product Updates (4+)
    const filterBucket = (items: typeof allItems, threshold: number) => 
        items.filter(i => i.score >= threshold);

    // Log pre-filter bucket distribution with scores
    logger.info(`Bucket distribution BEFORE filtering by score threshold:`);
    logger.info(`  Research: ${buckets.research.length} items (scores: ${buckets.research.map(i => i.score).join(', ')})`);
    logger.info(`  Competitive: ${buckets.competitive.length} items (scores: ${buckets.competitive.map(i => i.score).join(', ')})`);
    logger.info(`  Industry: ${buckets.industry.length} items (scores: ${buckets.industry.map(i => i.score).join(', ')})`);
    logger.info(`  Community: ${buckets.community.length} items (scores: ${buckets.community.map(i => i.score).join(', ')})`);
    logger.info(`  Newsletter: ${buckets.newsletter.length} items (scores: ${buckets.newsletter.map(i => i.score).join(', ')})`);
    logger.info(`  AI Insights: ${buckets.ai_insights.length} items (scores: ${buckets.ai_insights.map(i => i.score).join(', ')})`);
    logger.info(`  Product Updates: ${buckets.product_updates.length} items (scores: ${buckets.product_updates.map(i => i.score).join(', ')})`);

    buckets.research = filterBucket(buckets.research, 7);
    buckets.competitive = filterBucket(buckets.competitive, 7);
    buckets.industry = filterBucket(buckets.industry, 7);
    buckets.community = filterBucket(buckets.community, 5);
    buckets.newsletter = filterBucket(buckets.newsletter, 5);
    buckets.ai_insights = filterBucket(buckets.ai_insights, 5);
    buckets.product_updates = filterBucket(buckets.product_updates, 4);

    // Log post-filter bucket distribution
    logger.info(`Bucket distribution AFTER filtering by score threshold:`);
    logger.info(`  Research (threshold 7): ${buckets.research.length} items`);
    logger.info(`  Competitive (threshold 7): ${buckets.competitive.length} items`);
    logger.info(`  Industry (threshold 7): ${buckets.industry.length} items`);
    logger.info(`  Community (threshold 5): ${buckets.community.length} items`);
    logger.info(`  Newsletter (threshold 5): ${buckets.newsletter.length} items`);
    logger.info(`  AI Insights (threshold 5): ${buckets.ai_insights.length} items`);
    logger.info(`  Product Updates (threshold 4): ${buckets.product_updates.length} items`);

    // Check if we have any content at all
    const totalItems = Object.values(buckets).reduce((sum, b) => sum + b.length, 0);
    if (totalItems === 0) {
         return `No relevant content found in the last ${days} days.`;
    }

    // Helper to extract original URL from Inoreader blobs
    const extractOriginalUrl = (item: any): string => {
        const url = item.url || '';
        const content = item.content || item.summary || '';
        
        // If not an Inoreader blob, return the URL as-is
        if (!url.includes('inoreader.com/article/')) {
            return url;
        }
        
        // Try to extract original URL from content
        const hrefMatch = content.match(/href=['"]([^'"]+)['"]/);
        if (hrefMatch && hrefMatch[1] && hrefMatch[1].startsWith('http')) {
            return hrefMatch[1];
        }
        
        const sourceMatch = content.match(/(Read|Source|original|article).*?(https?:\/\/[^\s<>"]+)/i);
        if (sourceMatch && sourceMatch[2]) {
            return sourceMatch[2];
        }
        
        const urlMatch = content.match(/https?:\/\/[^\s<>"]+/);
        if (urlMatch && urlMatch[0] && !urlMatch[0].includes('inoreader.com')) {
            return urlMatch[0];
        }
        
        return url;
    };

    // Helper to map items for LLM
    const mapItem = (i: any) => {
        const item = i.item;
        return {
            title: item.title,
            url: extractOriginalUrl(item),
            score: i.score,
            reasoning: i.reasoning,
            source: (item as any).feedName || 'RSS',
            summary: (item as any).summary || (item as any).contentSnippet,
            tags: item.tags
        };
    };

    logger.info(`Generating newsletter with:
         Research: ${buckets.research.length}
         Competitive: ${buckets.competitive.length}
         Industry: ${buckets.industry.length}
         Product Updates: ${buckets.product_updates.length}
         AI Insights: ${buckets.ai_insights.length}
         Community: ${buckets.community.length}
         Newsletter: ${buckets.newsletter.length}
     `);

    const fromDate = cutoff.toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    // 5. Generate Newsletter Content
    const prompt = 
        `You are an expert technical editor for a specialized market intelligence update.\n` +
        `Create a weekly newsletter based on the provided High Relevance Items, organized into key sections.\n` +
        `Focus on **Actionable Insights**, **Competitive Intelligence**, **Research**, and **Developer Trends**.\n` +
        `IMPORTANT: Include source URLs as markdown links [like this](url) for EVERY item provided.\n` +
        `IMPORTANT: Include 3-7 items per section. If fewer items are provided, include all of them.\n\n` +
        
        `1. RESEARCH:\n${JSON.stringify(buckets.research.slice(0, 7).map(i => mapItem(i)), null, 2)}\n\n` +
        `2. COMPETITIVE INTEL:\n${JSON.stringify(buckets.competitive.slice(0, 7).map(i => mapItem(i)), null, 2)}\n\n` +
        `3. PRODUCT UPDATES & CHANGELOGS:\n${JSON.stringify(buckets.product_updates.slice(0, 7).map(i => mapItem(i)), null, 2)}\n\n` +
        `4. AI INSIGHTS & TRENDS:\n${JSON.stringify(buckets.ai_insights.slice(0, 7).map(i => mapItem(i)), null, 2)}\n\n` +
        `5. INDUSTRY UPDATES:\n${JSON.stringify(buckets.industry.slice(0, 7).map(i => mapItem(i)), null, 2)}\n\n` +
        `6. COMMUNITY SIGNAL:\n${JSON.stringify(buckets.community.slice(0, 7).map(i => mapItem(i)), null, 2)}\n\n` +
        `7. DEVELOPER NEWSLETTER DIGESTS:\n${JSON.stringify(buckets.newsletter.slice(0, 7).map(i => mapItem(i)), null, 2)}\n\n` +
        
        `Format:\n` +
        `# Market Intelligence: Code Search, Context, & Developer Experience (${fromDate} to ${toDate})\n\n` +
        
        `## Executive Brief\n` +
        `[Synthesize 2-3 key trends this week. Connect patterns across research, product launches, and community signals.]\n\n` +
        
        `## Research\n` +
        `Academic findings from arXiv on code understanding, agents, context management, or information retrieval.\n` +
        `Format: For EACH item, include: **[Title](url)** - Key technical insight and relevance to code intelligence\n\n` +

        `## Product Updates & Changelogs\n` +
        `New features from GitHub, OpenAI, Anthropic, Cursor, and coding tool companies. Include ALL items provided.\n` +
        `Format: For EACH item, include: **[Title](url)** - What changed and why it matters for developers\n\n` +

        `## Competitive Intelligence\n` +
        `Strategic moves: funding, acquisitions, launches from competitors in code intelligence space. Include ALL items provided.\n` +
        `Format: For EACH item, include: **[Title](url)** - Market implication\n\n` +

        `## AI Insights & Architecture\n` +
        `Trends in LLM architectures, agentic systems, reasoning approaches applicable to code. Include ALL items provided.\n` +
        `Format: For EACH item, include: **[Title](url)** - Why it matters for AI-powered developer tools\n\n` +
        
        `## Industry Trends\n` +
        `Broader tech trends, engineering blogs, infrastructure advances. Include ALL items provided.\n` +
        `Format: For EACH item, include: **[Title](url)** - Connection to code intelligence and developer experience\n\n` +

        `## Developer Community Signal\n` +
        `What developers discuss on Reddit, forums, and communities - sentiment and emerging needs. Include ALL items provided.\n` +
        `Format: For EACH item, include: **[Title](url)** - Core insight and community sentiment\n\n` +

        `## Weekly Newsletter Digests\n` +
        `Curated insights from TLDR, Pragmatic Engineer, Byte Byte Go, Pointer, Architecture Notes, etc. Include ALL items provided.\n` +
        `Format: For EACH item, include: **[Source - Title](url)** - Why it's relevant to our focus areas\n`;

    const newsletter = await generateCompletion(prompt, "Generate markdown.", { highQuality: true });
    return newsletter;
}
