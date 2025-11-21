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

    // 3. Filter High-Scoring Items (Score >= 6)
    const RELEVANCE_THRESHOLD = 6;
    const highValueItems = curatedItems.filter(i => i.score >= RELEVANCE_THRESHOLD);

    // 4. Categorize for Final Newsletter
    const curatedPapers = highValueItems
        .filter(i => i.item.source === 'ads')
        .map(i => ({
            title: i.item.title,
            authors: (i.item as any).authors.join(', '),
            abstract: (i.item as any).abstract,
            reasoning: i.reasoning,
            score: i.score,
            url: i.item.url
        }));

    const curatedArticles = highValueItems
        .filter(i => i.item.source === 'rss')
        .map(i => ({
            title: i.item.title,
            summary: (i.item as any).summary,
            reasoning: i.reasoning,
            source: (i.item as any).feedName,
            company: (i.item as any).company,
            type: (i.item as any).contentType,
            tags: (i.item as any).tags,
            score: i.score,
            url: i.item.url
        }));

    if (curatedPapers.length === 0 && curatedArticles.length === 0) {
         return `No high-relevance content found in the last ${days} days (Threshold: ${RELEVANCE_THRESHOLD}).`;
    }

    const contentSummary = {
        academic_research: curatedPapers,
        industry_articles: curatedArticles
    };

    logger.info(`Generating newsletter with ${curatedPapers.length} papers and ${curatedArticles.length} articles after curation.`);

    const fromDate = cutoff.toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    const newsletter = await generateCompletion(
        "You are an expert editor for a tech newsletter focused on code search, AI agents, and developer productivity. Analyze the provided *curated* content and create a comprehensive weekly update. \n\nGuidelines:\n- Start with a Top-Level Header: '# Research & Engineering Update (" + fromDate + " to " + toDate + ")'\n- Start with a '## TL;DR Highlights' section containing 3-5 bullet points of the most impactful items. Each bullet MUST include a markdown link to the source (e.g., 'Researchers at MIT introduced [MethodName](url)...').\n- **PRIORITIZE** items related to **Context Engineering**, **Information Retrieval**, and **Semantic Search** for codebases in the highlights (e.g. Greptile, RAG, Vector DBs).\n- After the highlights, include **ALL** provided items in the detailed sections.\n- Separately highlight 'Academic Research' and 'Industry Updates'.\n- Do NOT display the numerical relevance score.\n- Format each item as follows:\n  ### [Title](URL)\n  **Source:** [Feed Name / Company]\n  **Why it matters:** [Use the reasoning provided to explain the impact]\n  **Key Takeaways:**\n  - [Bulleted list of 2-3 specific technical details or insights from the abstract/summary]\n  [Brief summary paragraph]\n\nFormat as Markdown.",
        `Curated Content for the last ${days} days:\n${JSON.stringify(contentSummary, null, 2)}`
    );

    return newsletter;
}
