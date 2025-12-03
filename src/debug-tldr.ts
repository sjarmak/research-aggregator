import { store } from './lib/store/json-store.js';

async function inspectTLDR() {
    await store.init();
    const articles = store.getAllArticles();
    
    // Find TLDR items
    const tldrItems = articles.filter(a => a.feedName && a.feedName.includes('TLDR'));
    
    console.log(`Found ${tldrItems.length} TLDR items.`);
    
    if (tldrItems.length > 0) {
        const item = tldrItems[0];
        console.log('--- TLDR Item Debug ---');
        console.log(`Title: ${item.title}`);
        console.log(`URL: ${item.url}`);
        console.log(`Content (first 200 chars): ${item.content?.substring(0, 200)}`);
        console.log(`Summary (first 200 chars): ${item.summary?.substring(0, 200)}`);
    } else {
        console.log("No TLDR items found.");
    }
}

inspectTLDR();
