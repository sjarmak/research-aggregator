import { adsClient } from './lib/ads/client.js';

async function main() {
  console.log("Searching for papers about black holes...");
  try {
    // Search for "black holes"
    const results = await adsClient.search("title:\"black hole\"", { rows: 5, sort: "date desc" });
    
    console.log(`Found ${results.response.numFound} papers.`);
    console.log("Top 5 recent papers:");
    
    for (const paper of results.response.docs) {
      console.log(`\nTitle: ${paper.title?.[0]}`);
      console.log(`Authors: ${paper.author?.slice(0, 3).join(", ")}${paper.author && paper.author.length > 3 ? " et al." : ""}`);
      console.log(`Year: ${paper.year}`);
      console.log(`Bibcode: ${paper.bibcode}`);
    }
  } catch (error) {
    console.error("Search failed:", error);
  }
}

main();
