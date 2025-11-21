
import { store } from './dist/lib/store/json-store.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    await store.init();
    const articles = store.getAllArticles();
    
    const days = 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    console.log(`Total articles in store: ${articles.length}`);
    console.log(`Cutoff date: ${cutoff.toISOString()}`);

    const RELEVANCE_KEYWORDS = [
        "code search", "rag", "retrieval", "embedding", "vector", "agent", "llm", 
        "transformer", "productivity", "ide", "context", "ranking", "semantic",
        "dev tool", "copilot", "ai", "software", "engineering", "machine learning"
    ];

    const recentArticles = articles.filter(a => {
        const date = a.publishedAt || a.ingestedAt;
        const pubDate = new Date(date);
        const isRecent = !isNaN(pubDate.getTime()) && pubDate >= cutoff;
        return isRecent;
    });

    console.log(`\nArticles passing DATE filter: ${recentArticles.length}`);
    
    const relevantArticles = recentArticles.filter(a => {
        const text = `${a.title} ${a.summary || ''}`.toLowerCase();
        const matches = RELEVANCE_KEYWORDS.some(kw => text.includes(kw));
        if (!matches) {
             // console.log(`[Rejected] ${a.title} (Feed: ${a.feedName})`);
        }
        return matches;
    });

    console.log(`Articles passing KEYWORD filter: ${relevantArticles.length}`);
    
    console.log("\n--- Relevant Articles ---");
    relevantArticles.forEach(a => {
        console.log(`- [${a.feedName}] ${a.title} (${a.publishedAt})`);
    });

    console.log("\n--- Rejected (Recent but not relevant) ---");
    recentArticles.filter(a => !relevantArticles.includes(a)).slice(0, 10).forEach(a => {
        console.log(`- [${a.feedName}] ${a.title}`);
    });
}

main();
