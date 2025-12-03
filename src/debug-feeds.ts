import { store } from './lib/store/json-store.js';

async function checkFeeds() {
    await store.init();
    const articles = store.getAllArticles();
    
    const specificFeeds = ['ByteByteGo', 'TLDR', 'Pragmatic Engineer'];
    const found: Record<string, number> = {};
    
    console.log(`Total articles in store: ${articles.length}`);
    console.log("--- Feeds found ---");
    
    const feedCounts: Record<string, number> = {};
    
    articles.forEach(a => {
        const feed = a.feedName || 'Unknown';
        feedCounts[feed] = (feedCounts[feed] || 0) + 1;
        
        // Check for specific matches (case insensitive partial)
        specificFeeds.forEach(target => {
            if (feed.toLowerCase().includes(target.toLowerCase())) {
                found[target] = (found[target] || 0) + 1;
            }
        });
    });
    
    // Sort feeds by count
    Object.entries(feedCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([feed, count]) => {
            console.log(`${feed}: ${count}`);
        });
        
    console.log("\n--- Target Feeds Check ---");
    specificFeeds.forEach(feed => {
        if (found[feed]) {
            console.log(`✅ ${feed}: ${found[feed]} articles`);
        } else {
            console.log(`❌ ${feed}: 0 articles`);
        }
    });
}

checkFeeds();
