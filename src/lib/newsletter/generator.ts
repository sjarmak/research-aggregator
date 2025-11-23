import { logger } from "../logger.js";
import { config } from "../../config.js";
import { store } from "../store/json-store.js";
import { generateCompletion } from "../llm/client.js";
import { curateContent } from "./curator.js";

export async function generateNewsletter(days: number = 7): Promise<string> {
    await store.init();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // 1. Initial Filter (Date & Type)
    const recentPapers = store.getAllPapers().filter(p => 
        new Date(p.ingestedAt) >= cutoff && (p.year ? parseInt(p.year) >= 2025 : false)
    );

    const recentArticles = store.getAllArticles().filter(a => {
        const date = a.publishedAt || a.ingestedAt;
        const pubDate = new Date(date);
        return !isNaN(pubDate.getTime()) && pubDate >= cutoff;
    });

    logger.info(`Found candidates: ${recentPapers.length} papers, ${recentArticles.length} articles. Starting LLM curation...`);

    // 2. LLM Curation & Scoring
    const candidates = [...recentPapers, ...recentArticles];
    const curatedItems = await curateContent(candidates);

    // 3. Filter & Sort
    // Papers tend to score higher (10-17), while industry blogs score lower (4-10).
    // We use different thresholds to ensure we don't filter out good industry content.
    const PAPER_THRESHOLD = 6;
    const ARTICLE_THRESHOLD = 3.5;

    const sortedItems = curatedItems
        .filter(i => {
            const isPaper = i.item.source === 'ads';
            return i.score >= (isPaper ? PAPER_THRESHOLD : ARTICLE_THRESHOLD);
        })
        .sort((a, b) => b.score - a.score);

    if (sortedItems.length === 0) {
         return `No high-relevance content found in the last ${days} days.`;
    }

    // 4. Split into Top 5 (Mixed Selection)
    const papers = sortedItems.filter(i => i.item.source === 'ads');
    const articles = sortedItems.filter(i => i.item.source !== 'ads');

    // Target: 3 Papers, 2 Articles (flexible)
    const targetPapers = 3;
    const targetArticles = 2;

    const selectedPapers = papers.slice(0, targetPapers);
    const remainingPapers = papers.slice(targetPapers);

    const selectedArticles = articles.slice(0, targetArticles);
    const remainingArticles = articles.slice(targetArticles);

    // Fill gaps if one category is short
    let featuredItems = [...selectedPapers, ...selectedArticles];
    
    if (selectedPapers.length < targetPapers) {
        // Fill with more articles
        const needed = targetPapers - selectedPapers.length;
        featuredItems.push(...remainingArticles.slice(0, needed));
        remainingArticles.splice(0, needed); // Remove taken items
    } else if (selectedArticles.length < targetArticles) {
        // Fill with more papers
        const needed = targetArticles - selectedArticles.length;
        featuredItems.push(...remainingPapers.slice(0, needed));
        remainingPapers.splice(0, needed);
    }

    // Re-sort featured items by score for display
    featuredItems.sort((a, b) => b.score - a.score);
    
    // The rest go to "Other Items"
    // We need to reconstruct the pool of unselected items
    const usedIds = new Set(featuredItems.map(i => i.item.id));
    const otherItems = sortedItems.filter(i => !usedIds.has(i.item.id));

    // Helper to map items for LLM
    const mapItem = (i: any, includeContext: boolean = true) => {
        const item = i.item;
        return {
            title: item.title,
            url: item.url,
            score: i.score,
            reasoning: i.reasoning,
            source: item.source === 'ads' ? 'Academic Paper' : (item.feedName || 'RSS'),
            // Only include full abstract for featured items
            context: includeContext ? (item.source === 'ads' ? item.abstract : (item.summary || item.contentSnippet)) : undefined,
            authors: item.authors ? item.authors.join(', ') : item.author,
            tags: item.tags
        };
    };

    const contentContext = {
        featured: featuredItems.map(i => mapItem(i, true)),
        additional_reads: otherItems.map(i => mapItem(i, false)) // No context for these
    };

    logger.info(`Generating newsletter with ${featuredItems.length} featured and ${otherItems.length} additional items.`);

    const fromDate = cutoff.toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    // 1. Generate Highlights & Deep Dives
    const featuredPrompt = 
        `You are an expert tech editor. Create the main section of a newsletter based on these 5 featured items.\n\n` +
        `Content:\n${JSON.stringify(featuredItems.map(i => mapItem(i, true)), null, 2)}\n\n` +
        `Format:\n` +
        `# Research and Industry Updates (${fromDate} to ${toDate})\n\n` +
        `## TL;DR Highlights\n` +
        `- [3-5 bullet points with links]\n\n` +
        `## Deep Dives\n` +
        `(Detailed section for each item: Title, Source, Why it matters, Key Takeaways, Summary)`;

    const featuredPart = await generateCompletion(featuredPrompt, "Generate markdown.");

    // 2. Generate Additional Reads (Programmatically)
    let additionalPart = "";
    if (otherItems.length > 0) {
        additionalPart = "## Additional Reads\n\n";
        additionalPart += otherItems.map(i => {
            const item = i.item;
            // Clean up reasoning (remove "Score X/10" if present)
            const comment = i.reasoning.replace(/^Score \d+(\/\d+)?:?\s*/i, '');
            return `- **[${item.title}](${item.url})**: ${comment}`;
        }).join('\n');
    }

    return `${featuredPart}\n\n${additionalPart}`;
}
