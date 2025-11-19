import { adsClient, AdsPaper } from '../ads/client.js';
import { store } from '../store/json-store.js';
import { Paper } from '../store/schema.js';

export async function ingestLibrary(libraryId: string, libraryName: string) {
  console.log(`Starting ingestion for library: ${libraryName} (${libraryId})...`);
  
  // 1. Fetch papers from ADS
  const adsPapers = await adsClient.getLibraryPapers(libraryId);
  console.log(`Fetched ${adsPapers.length} papers from ADS.`);

  // 2. Convert to our internal schema
  const papers: Paper[] = adsPapers.map(p => ({
    id: p.bibcode,
    bibcode: p.bibcode,
    title: p.title ? p.title[0] : 'Untitled',
    authors: p.author || [],
    year: p.year,
    abstract: p.abstract,
    publication: p.pub,
    keywords: p.keyword,
    source: 'ads',
    ingestedAt: new Date().toISOString(),
    libraryId: libraryId
  }));

  // 3. Save to store
  await store.init();
  await store.addPapers(papers);
  console.log(`Saved ${papers.length} papers to local knowledge store.`);
}

export async function syncAllLibraries() {
    console.log("Syncing all ADS libraries...");
    const libraries = await adsClient.getLibraries();
    
    for (const lib of libraries) {
        await ingestLibrary(lib.id, lib.name);
    }
    console.log("Sync complete.");
}
