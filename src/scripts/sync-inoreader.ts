import { InoreaderIngester } from '../lib/ingest/inoreader-ingest.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Initializing Inoreader sync...');
    const ingester = new InoreaderIngester();
    
    const limitStr = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitStr ? parseInt(limitStr.split('=')[1]) : 50;

    // Sync the default reading list (all subscribed feeds)
    // Using 'user/-/state/com.google/reading-list' which is the standard tag for all items
    const count = await ingester.sync('user/-/state/com.google/reading-list', limit);
    
    console.log(`Successfully synced ${count} articles.`);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
