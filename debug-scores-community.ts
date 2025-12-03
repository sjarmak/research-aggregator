
import { store } from './src/lib/store/json-store.js';
import { curateContent } from './src/lib/newsletter/curator.js';
import { logger } from './src/lib/logger.js';

async function main() {
    await store.init();
    const allArticles = store.getAllArticles();

    // Filter for TLDR and Reddit items specifically
    const communityAndNewsletter = allArticles.filter(a => {
        const feed = (a.feedName || '').toLowerCase();
        const url = (a.url || '').toLowerCase();
        return feed.includes('tldr') || feed.includes('newsletter') || url.includes('reddit');
    });

    console.log(`Found ${communityAndNewsletter.length} Community/Newsletter items in store.`);

    if (communityAndNewsletter.length > 0) {
        // Take a sample of 10
        const sample = communityAndNewsletter.slice(0, 10);
        console.log("Curating sample to check scores...");
        
        const results = await curateContent(sample);
        
        console.log("\n=== SCORING DEBUG ===");
        results.forEach(r => {
            console.log(`[${r.score}] ${r.item.title} (${(r.item as any).feedName})`);
            console.log(`Reasoning: ${r.reasoning}\n`);
        });
    }
}

main();
