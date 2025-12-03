
import { ingestRssFeeds } from './src/lib/ingest/rss-ingest.js';

async function run() {
    console.log('Running RSS Ingestion...');
    try {
        await ingestRssFeeds();
        console.log('Done.');
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
