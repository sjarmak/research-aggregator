import { adsClient, AdsPaper } from '../ads/client.js';
import { store } from '../store/json-store.js';
import { Paper } from '../store/schema.js';
import { logger } from '../logger.js';
import { classifyContent, calculateScore } from './classifier.js';

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
            let pubDate = new Date(p.pubdate);
            if (isNaN(pubDate.getTime())) {
                pubDate = new Date(); // Fallback logic could be improved
            }

            // Check if paper is within the last 'days'
            if (pubDate < cutoff) {
                skippedCount++;
                continue; 
            }

            const { contentType, tags } = classifyContent(
                p.title ? p.title[0] : '', 
                p.abstract || ''
            );

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
                publishedAt: pubDate.toISOString(),
                libraryId: 'ads-ingest',
                keywords: p.keyword || [],
                contentType,
                tags,
            };

            paper.score = calculateScore(paper, 'paper', contentType, tags);

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
