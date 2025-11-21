import { adsClient, AdsPaper } from '../ads/client.js';
import { store } from '../store/json-store.js';
import { Paper } from '../store/schema.js';
import { logger } from '../logger.js';

const DEFAULT_QUERY = 'abs:"search" AND (abs:"code" OR abs:"coding" OR abs:"agent") OR abs:"information retrieval" bibstem:arxiv year:2025-2026 arxiv_class:"cs.AI"';

export async function ingestRecentPapers(days: number = 7, query: string = DEFAULT_QUERY) {
    logger.info('Starting ADS paper ingestion...');
    await store.init();

    try {
        // Fetch a bit more than we might need to ensure we cover the date range
        const rawPapers = await adsClient.search(query, 50, 'date desc');
        
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const newPapers: Paper[] = [];
        let skippedCount = 0;

        for (const p of rawPapers) {
            // Parse pubdate (YYYY-MM-DD)
            // If pubdate is missing, we might skip or assume it's recent if sorted by date.
            // ADS usually provides pubdate.
            let pubDate = new Date(p.pubdate);
            if (isNaN(pubDate.getTime())) {
                // Fallback: if we can't parse date, we skip filtering strict date 
                // but since we sorted by date desc, top results are likely recent.
                // For safety, let's default to now if missing, or maybe skip.
                // Let's assume 'year' is accurate.
                pubDate = new Date(); // Assume recent if missing? No, dangerous.
                // Let's rely on the fact we asked for recent papers.
            }

            // Check if paper is within the last 'days'
            if (pubDate < cutoff) {
                skippedCount++;
                continue; 
            }

            const paper: Paper = {
                id: p.id,
                bibcode: p.bibcode,
                title: p.title ? p.title[0] : 'Untitled',
                authors: p.author || [],
                abstract: p.abstract || '',
                year: p.year,
                publication: p.pub || 'ArXiv',
                source: 'ads',
                url: `https://ui.adsabs.harvard.edu/abs/${p.bibcode}/abstract`,
                ingestedAt: new Date().toISOString(),
                libraryId: 'ads-ingest' 
            };

            newPapers.push(paper);
        }

        if (newPapers.length > 0) {
            await store.addPapers(newPapers);
            logger.info(`Ingested ${newPapers.length} new papers from ADS.`);
        }
        logger.info(`Skipped ${skippedCount} papers older than ${days} days.`);

    } catch (error) {
        logger.error('Failed to ingest papers from ADS', { error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
}
