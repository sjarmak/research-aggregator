import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleToolCall } from './registry.js';
import { sgClient } from '../sourcegraph/client.js';
import { store } from '../store/json-store.js';
import { config } from '../../config.js';

// Mock the dependencies
vi.mock('../sourcegraph/client.js', () => ({
  sgClient: {
    search: vi.fn(),
    readFile: vi.fn(),
  },
}));

vi.mock('../store/json-store.js', () => ({
  store: {
    init: vi.fn(),
    getAllPapers: vi.fn(),
    getPapersByLibrary: vi.fn(),
    getAllArticles: vi.fn(),
  },
}));

describe('Tool Registry', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default store mocks
    (store.init as any).mockResolvedValue(undefined);
    (store.getAllPapers as any).mockReturnValue([]);
    (store.getAllArticles as any).mockReturnValue([]);
    (store.getPapersByLibrary as any).mockReturnValue([]);
  });

  describe('sg_search', () => {
    it('should call sgClient.search with correct arguments', async () => {
      (sgClient.search as any).mockResolvedValue({ results: [] });

      await handleToolCall('sg_search', { query: 'test', pattern_type: 'regexp' });

      expect(sgClient.search).toHaveBeenCalledWith('test', { patternType: 'regexp' });
    });

    it('should return error message on failure', async () => {
      (sgClient.search as any).mockRejectedValue(new Error('Sourcegraph API Error (401): Unauthorized'));

      const result = await handleToolCall('sg_search', { query: 'test' });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication failed');
    });
  });

  describe('sg_read_file', () => {
      it('should call sgClient.readFile', async () => {
          (sgClient.readFile as any).mockResolvedValue('content');

          const result = await handleToolCall('sg_read_file', { repository: 'repo', path: 'file' });
          
          expect(sgClient.readFile).toHaveBeenCalledWith('repo', 'file', 'HEAD');
          expect(result.content[0].text).toBe('content');
      });
  });

  describe('get_recent_articles', () => {
      it('should return articles from store', async () => {
          const articles = [
              { title: 'A1', url: 'u1', summary: 's1', feedName: 'f1', publishedAt: '2023-01-01' }
          ];
          (store.getAllArticles as any).mockReturnValue(articles);

          const result = await handleToolCall('get_recent_articles', {});
          
          expect(store.init).toHaveBeenCalled();
          expect(store.getAllArticles).toHaveBeenCalled();
          const content = JSON.parse(result.content[0].text);
          expect(content).toHaveLength(1);
          expect(content[0].title).toBe('A1');
      });
  });

  describe('multi_source_research', () => {
      it('should combine local papers and rss', async () => {
          (store.getAllPapers as any).mockReturnValue([{ title: 'Paper 1' }]);
          (store.getAllArticles as any).mockReturnValue([{ title: 'Article 1' }]);

          const result = await handleToolCall('multi_source_research', { query: '1' });
          
          const content = JSON.parse(result.content[0].text);
          expect(content.local_papers).toHaveLength(1);
          expect(content.rss_articles).toHaveLength(1);
      });
  });
});
