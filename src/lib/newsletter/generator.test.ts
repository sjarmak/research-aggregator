import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateNewsletter } from './generator.js';
import { store } from '../store/json-store.js';
import { curateContent } from './curator.js';
import { generateCompletion } from '../llm/client.js';

// Mock dependencies
vi.mock('../store/json-store.js', () => ({
  store: {
    init: vi.fn(),
    getAllPapers: vi.fn().mockReturnValue([]),
    getAllArticles: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('./curator.js', () => ({
  curateContent: vi.fn().mockResolvedValue([]),
}));

vi.mock('../llm/client.js', () => ({
  generateCompletion: vi.fn(),
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../config.js', () => ({
  config: {
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'gpt-4o',
  },
}));

describe('Newsletter Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return "No content" message if no items found in store', async () => {
    // store methods return empty arrays by default from mock
    const result = await generateNewsletter(7);
    
    expect(store.init).toHaveBeenCalled();
    expect(result).toContain('No high-relevance content found');
    expect(generateCompletion).not.toHaveBeenCalled();
  });

  it('should filter out old papers and articles before curation', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    
    const newDate = new Date();
    
    const mockPapers = [
      { title: 'Old Paper', ingestedAt: oldDate.toISOString(), year: '2024', source: 'ads' },
      { title: 'New Paper', ingestedAt: newDate.toISOString(), year: '2025', source: 'ads' },
    ];
    
    const mockArticles = [
      { title: 'Old Article', publishedAt: oldDate.toISOString(), source: 'rss' },
      { title: 'New Article', publishedAt: newDate.toISOString(), source: 'rss' },
    ];

    vi.mocked(store.getAllPapers).mockReturnValue(mockPapers as any);
    vi.mocked(store.getAllArticles).mockReturnValue(mockArticles as any);
    vi.mocked(curateContent).mockResolvedValue([]); // Return empty to avoid proceeding to generation

    await generateNewsletter(7);

    // Verify curateContent was called only with recent items
    expect(curateContent).toHaveBeenCalledTimes(1);
    const calledItems = vi.mocked(curateContent).mock.calls[0][0];
    
    expect(calledItems).toHaveLength(2);
    expect(calledItems.find((i: any) => i.title === 'New Paper')).toBeTruthy();
    expect(calledItems.find((i: any) => i.title === 'New Article')).toBeTruthy();
    expect(calledItems.find((i: any) => i.title === 'Old Paper')).toBeFalsy();
  });

  it('should filter out items with low scores (score < 6)', async () => {
    const newDate = new Date().toISOString();
    const mockPapers = [{ title: 'Paper', ingestedAt: newDate, year: '2025', source: 'ads', url: 'http://p1' }];
    
    vi.mocked(store.getAllPapers).mockReturnValue(mockPapers as any);
    
    // curateContent returns items with low score
    vi.mocked(curateContent).mockResolvedValue([
      { item: mockPapers[0], score: 5, reasoning: 'Low score', id: '1' } as any
    ]);

    const result = await generateNewsletter(7);

    expect(result).toContain('No high-relevance content found');
    expect(generateCompletion).not.toHaveBeenCalled();
  });

  it('should generate newsletter when high scoring items exist', async () => {
    const newDate = new Date().toISOString();
    const mockPaper = { 
        title: 'High Impact Paper', 
        ingestedAt: newDate, 
        year: '2025', 
        source: 'ads', 
        authors: ['Alice', 'Bob'],
        abstract: 'Abstract',
        url: 'http://paper'
    };
    
    const mockArticle = { 
        title: 'Important News', 
        publishedAt: newDate, 
        source: 'rss', 
        summary: 'Summary',
        feedName: 'TechCrunch',
        company: 'OpenAI',
        contentType: 'product_launch',
        tags: ['ai'],
        url: 'http://news'
    };

    vi.mocked(store.getAllPapers).mockReturnValue([mockPaper as any]);
    vi.mocked(store.getAllArticles).mockReturnValue([mockArticle as any]);

    vi.mocked(curateContent).mockResolvedValue([
      { item: mockPaper, score: 9, reasoning: 'Groundbreaking', id: '1' } as any,
      { item: mockArticle, score: 8, reasoning: 'Major launch', id: '2' } as any
    ]);

    vi.mocked(generateCompletion).mockResolvedValue('# Newsletter\n\n## Highlights\n...');

    const result = await generateNewsletter(7);

    expect(result.trim()).toBe('# Newsletter\n\n## Highlights\n...');
    expect(generateCompletion).toHaveBeenCalled();
    
    // Check that the prompt includes the items
    const promptContext = vi.mocked(generateCompletion).mock.calls[0][0];
    expect(promptContext).toContain('High Impact Paper');
    expect(promptContext).toContain('Important News');
  });

  it('should include articles with scores >= 3.5 but < 6', async () => {
    const newDate = new Date().toISOString();
    const mockArticle = { 
        title: 'Niche Article', 
        publishedAt: newDate, 
        source: 'rss', 
        url: 'http://news'
    };

    vi.mocked(store.getAllPapers).mockReturnValue([]);
    vi.mocked(store.getAllArticles).mockReturnValue([mockArticle as any]);

    vi.mocked(curateContent).mockResolvedValue([
      { item: mockArticle, score: 4.5, reasoning: 'Good but niche', id: '1' } as any
    ]);

    vi.mocked(generateCompletion).mockResolvedValue('# Newsletter');

    const result = await generateNewsletter(7);

    expect(result).toContain('Newsletter');
    const promptContext = vi.mocked(generateCompletion).mock.calls[0][0];
    expect(promptContext).toContain('Niche Article');
  });
});
