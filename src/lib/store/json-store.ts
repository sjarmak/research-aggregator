import fs from 'fs/promises';
import path from 'path';
import { KnowledgeStore, KnowledgeStoreSchema, Paper, ExternalArticle } from './schema.js';

const DATA_DIR = 'data';
const STORE_FILE = 'knowledge-store.json';

export class JsonStore {
  private filePath: string;
  private data: KnowledgeStore = { papers: [], articles: [], lastSync: new Date().toISOString() };

  constructor() {
    this.filePath = path.join(process.cwd(), DATA_DIR, STORE_FILE);
  }

  async init() {
    try {
      await fs.mkdir(path.join(process.cwd(), DATA_DIR), { recursive: true });
      const content = await fs.readFile(this.filePath, 'utf-8');
      // Parse with Zod but handle missing fields if schema evolved
      const parsed = JSON.parse(content);
      if (!parsed.articles) parsed.articles = [];
      this.data = KnowledgeStoreSchema.parse(parsed);
    } catch (error) {
      // If file doesn't exist or is invalid, start fresh
      // console.log('Initializing new knowledge store...');
      await this.save();
    }
  }

  async save() {
    this.data.lastSync = new Date().toISOString();
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async addPaper(paper: Paper) {
    const index = this.data.papers.findIndex(p => p.bibcode === paper.bibcode);
    if (index >= 0) {
      this.data.papers[index] = paper; // Update existing
    } else {
      this.data.papers.push(paper); // Add new
    }
    await this.save();
  }

  async addPapers(papers: Paper[]) {
    for (const paper of papers) {
        const index = this.data.papers.findIndex(p => p.bibcode === paper.bibcode);
        if (index >= 0) {
          this.data.papers[index] = paper;
        } else {
          this.data.papers.push(paper);
        }
    }
    await this.save();
  }

  async addArticles(articles: ExternalArticle[]) {
    for (const article of articles) {
        const index = this.data.articles.findIndex(a => a.id === article.id);
        if (index >= 0) {
          this.data.articles[index] = article;
        } else {
          this.data.articles.push(article);
        }
    }
    await this.save();
  }

  getAllPapers(): Paper[] {
    return this.data.papers;
  }

  getPapersByLibrary(libraryId: string): Paper[] {
    return this.data.papers.filter(p => p.libraryId === libraryId);
  }

  getAllArticles(): ExternalArticle[] {
    return this.data.articles;
  }
  
  // Helper to get a context string for LLMs
  getContextString(limit: number = 20): string {
      const sorted = [...this.data.papers].sort((a, b) => 
          new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime()
      );
      
      return sorted.slice(0, limit).map(p => 
          `Title: ${p.title}\nAuthors: ${p.authors.join(', ')}\nYear: ${p.year}\nAbstract: ${p.abstract || 'N/A'}\n`
      ).join('\n---\n');
  }
}

export const store = new JsonStore();
