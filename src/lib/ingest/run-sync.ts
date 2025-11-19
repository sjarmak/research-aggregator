import { syncAllLibraries } from './ads-ingest.js';
import { ingestRssFeeds } from './rss-ingest.js';
import { store } from '../store/json-store.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'ads') {
      await syncAllLibraries();
    } else if (command === 'rss') {
      await ingestRssFeeds();
    } else if (command === 'all' || !command) {
      await syncAllLibraries();
      await ingestRssFeeds();
    } else if (command === 'stats') {
        await store.init();
        console.log('--- Knowledge Store Stats ---');
        console.log(`Papers: ${store.getAllPapers().length}`);
        console.log(`RSS Articles: ${store.getAllArticles().length}`);
        console.log(`Last Sync: ${store['data'].lastSync}`);
    } else {
      console.log('Usage: node run-sync.js [ads|rss|all|stats]');
    }
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  }
}

main();
