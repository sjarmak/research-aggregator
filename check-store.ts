
import { store } from './src/lib/store/json-store.js';

async function check() {
    await store.init();
    const articles = store.getAllArticles();
    const tldr = articles.filter(a => (a.feedName === 'TLDR Tech' || a.author === 'TLDR') && !a.url.includes('inoreader.com'));
    
    console.log(`Found ${tldr.length} granular TLDR items.`);
    if (tldr.length > 0) {
        console.log('Sample:', tldr[0].title, tldr[0].url);
    }
}

check();
