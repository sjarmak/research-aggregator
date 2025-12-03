import { store } from './lib/store/json-store.js';
import { calculateScore } from './lib/ingest/classifier.js';

async function analyzeScores() {
    await store.init();
    const articles = store.getAllArticles();
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7); // Last 7 days

    const recentArticles = articles.filter(a => {
        const date = a.publishedAt || a.ingestedAt;
        const pubDate = new Date(date);
        return !isNaN(pubDate.getTime()) && pubDate >= cutoff;
    });

    console.log(`Recent articles (last 7 days): ${recentArticles.length}`);

    // Group by feed
    const feedStats: Record<string, { count: number, scores: number[], titles: string[] }> = {};

    for (const a of recentArticles) {
        const feed = a.feedName || 'Unknown';
        if (!feedStats[feed]) feedStats[feed] = { count: 0, scores: [], titles: [] };
        
        // Recalculate score to check classifier logic
        // Note: We don't have the 'tags' fully populated if they were ingested before the classifier update
        // But we can check what the stored score is if we had it, or recalculate.
        // The store schema has an optional score.
        
        feedStats[feed].count++;
        if (a.score) feedStats[feed].scores.push(a.score);
        if (feedStats[feed].titles.length < 3) feedStats[feed].titles.push(a.title);
    }

    console.log("\n--- Feed Statistics (Recent) ---");
    Object.entries(feedStats)
        .sort(([, a], [, b]) => b.count - a.count)
        .forEach(([feed, stats]) => {
            const avgScore = stats.scores.length ? (stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length).toFixed(2) : 'N/A';
            console.log(`\n${feed}:`);
            console.log(`  Count: ${stats.count}`);
            console.log(`  Avg Score: ${avgScore}`);
            console.log(`  Sample: ${stats.titles[0]}`);
        });
}

analyzeScores();
