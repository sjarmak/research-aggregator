
import { scrapeTLDR } from './src/lib/ingest/scraper.js';

async function test() {
    console.log('Testing scrapeTLDR...');
    try {
        const articles = await scrapeTLDR();
        console.log(`Found ${articles.length} articles.`);
        if (articles.length > 0) {
            console.log('First article:', JSON.stringify(articles[0], null, 2));
            console.log('Last article:', JSON.stringify(articles[articles.length - 1], null, 2));
        }
    } catch (error) {
        console.error('Error running scrapeTLDR:', error);
    }
}

test();
