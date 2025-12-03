import { scixClient } from './scix-client.js';
import { store } from '../store/json-store.js';
import { Paper } from '../store/schema.js';
import { logger } from '../logger.js';
import { classifyContent, calculateScore } from './classifier.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const DEFAULT_QUERY = 'abs:"search" AND (abs:"code" OR abs:"coding" OR abs:"agent") OR abs:"information retrieval" bibstem:arxiv year:2025-2026';

// Helper to fetch full text from ArXiv (via ar5iv or scraping)
async function fetchArxivFullText(arxivId: string): Promise<string | undefined> {
    // Try ar5iv first (HTML version of ArXiv papers)
    const ar5ivUrl = `https://ar5iv.org/html/${arxivId}`;
    try {
        const { data } = await axios.get(ar5ivUrl, {
            headers: { 'User-Agent': 'ResearchAgent/1.0' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        
        // Remove navigation, headers, references if possible to keep it clean
        $('.ltx_page_header, .ltx_page_footer, .ltx_bibliography').remove();
        
        // Get the main content
        const text = $('article').text() || $('body').text();
        return text.trim();
    } catch (error) {
        logger.warn(`Failed to fetch ar5iv for ${arxivId}, falling back to abstract only.`, { error: String(error) });
        // We could add PDF parsing here if pdf-parse was available
        return undefined;
    }
}

export async function ingestPapersFromScix(days: number = 7, query: string = DEFAULT_QUERY) {
    logger.info('Starting ADS paper ingestion via SciX MCP...');
    await store.init();

    try {
        // Call the MCP tool
        // The SDK callTool returns { content: [{ type: 'text', text: '...' }] }
        const result = await scixClient.search(query, 50) as any;
        
        // Parse the JSON result from the text content
        // The MCP tool "search" returns JSON string if response_format is json
        let rawPapers: any[] = [];
        if (result && result.content && result.content[0] && result.content[0].type === 'text') {
             try {
                const parsed = JSON.parse(result.content[0].text);
                rawPapers = parsed.response?.docs || [];
                if (rawPapers.length > 0) {
                    logger.info(`First paper fetched: Title="${rawPapers[0].title}", PubDate="${rawPapers[0].pubdate}", Year="${rawPapers[0].year}"`);
                }
             } catch (e) {
                logger.error("Failed to parse SciX MCP response", { error: String(e) });
                return;
             }
        }

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const newPapers: Paper[] = [];
        let skippedCount = 0;

        for (const p of rawPapers) {
            // Parse pubdate
            let pubDateStr = p.pubdate;
            if (pubDateStr && pubDateStr.includes('-00')) {
                pubDateStr = pubDateStr.replace('-00', '-01');
            }
            let pubDate = new Date(pubDateStr); 
            
            if (isNaN(pubDate.getTime())) {
                // Fallback to year
                if (p.year) {
                    pubDate = new Date(`${p.year}-01-01`);
                } else {
                    pubDate = new Date();
                }
            }

            if (pubDate < cutoff) {
                skippedCount++;
                continue;
            }

            // Classification
            const { contentType, tags } = classifyContent(
                p.title ? p.title[0] : '', 
                p.abstract || ''
            );

            // ID generation
            const bibcode = p.bibcode;
            const arxivId = p.arxiv_id ? p.arxiv_id[0] : undefined; // ADS returns array for arxiv_id

            // Fetch Full Text if body exists, else if ArXiv ID exists
            let fullText: string | undefined = p.body;
            
            if (!fullText && arxivId) {
                logger.info(`Fetching full text for ${bibcode} (ArXiv: ${arxivId})...`);
                fullText = await fetchArxivFullText(arxivId);
                // Sleep briefly to be nice to ar5iv
                await new Promise(r => setTimeout(r, 500));
            }

            const paper: Paper = {
                id: p.identifier ? p.identifier[0] : bibcode, // Use identifier or bibcode
                bibcode: bibcode,
                title: p.title ? p.title[0] : 'Untitled',
                authors: p.author || [],
                abstract: p.abstract || '',
                year: p.year,
                publication: p.pub || 'ArXiv',
                source: 'ads',
                url: arxivId ? `https://arxiv.org/abs/${arxivId}` : `https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`,
                ingestedAt: new Date().toISOString(),
                publishedAt: pubDate.toISOString(),
                libraryId: 'scix-mcp-ingest',
                keywords: p.keyword || [],
                contentType,
                tags,
                content: fullText
            };

            paper.score = calculateScore(paper, 'paper', contentType, tags);
            newPapers.push(paper);
        }

        if (newPapers.length > 0) {
            await store.addPapers(newPapers);
            logger.info(`Ingested ${newPapers.length} new papers from SciX.`);
        }
        logger.info(`Skipped ${skippedCount} papers older than ${days} days.`);

    } catch (error) {
        logger.error('Failed to ingest papers from SciX MCP', { error: String(error) });
        throw error;
    } finally {
        await scixClient.close();
    }
}
