import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ingestRssFeeds } from './rss-ingest.js';
import { store } from '../store/json-store.js';
import { logger } from '../logger.js';
import Parser from 'rss-parser';

const { mockParseURL } = vi.hoisted(() => {
  return { mockParseURL: vi.fn() };
});

// Mock dependencies
vi.mock('rss-parser', () => {
  return {
    default: vi.fn().mockImplementation(function() {
      return {
        parseURL: mockParseURL,
      };
    }),
  };
});

vi.mock('../store/json-store.js', () => ({
  store: {
    init: vi.fn(),
    getAllArticles: vi.fn().mockReturnValue([]),
    addArticles: vi.fn(),
  },
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock config
vi.mock('../../config.js', () => ({
  config: {
    API_MAX_RETRIES: 3,
    API_RETRY_DELAY: 1, // Fast retries for testing
  },
}));

describe('RSS Ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch feeds and store articles', async () => {
    const mockItem = {
      title: 'Test Article',
      link: 'http://example.com/article',
      contentSnippet: 'This is a test article about LLM agents',
      isoDate: new Date().toISOString(),
    };

    mockParseURL.mockResolvedValue({
      items: [mockItem],
    });

    await ingestRssFeeds();

    expect(mockParseURL).toHaveBeenCalled();
    expect(store.addArticles).toHaveBeenCalled();
    // We should verify that addArticles was called with the correct article
    const addedArticles = (store.addArticles as any).mock.calls[0][0];
    expect(addedArticles.length).toBeGreaterThanOrEqual(1); 
    expect(addedArticles[0].title).toBe('Test Article');
  });

  it('should retry on transient errors', async () => {
    // Fail twice with timeout, then succeed
    mockParseURL
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue({ items: [] });

    await ingestRssFeeds();
    
    expect(logger.warn).toHaveBeenCalled();
    const warningCalls = (logger.warn as any).mock.calls;
    const retryMessages = warningCalls.filter((args: any[]) => args[0].includes('Retrying'));
    expect(retryMessages.length).toBeGreaterThanOrEqual(2);
  });

  it('should give up after max retries', async () => {
    // Always fail
    mockParseURL.mockRejectedValue(new Error('ETIMEDOUT'));

    await ingestRssFeeds();

    expect(logger.error).toHaveBeenCalled();
    const errorCalls = (logger.error as any).mock.calls;
    const failedMessages = errorCalls.filter((args: any[]) => args[0].includes('Failed to fetch feed'));
    expect(failedMessages.length).toBeGreaterThan(0);
  });

  it('should not retry on non-transient errors', async () => {
    mockParseURL.mockRejectedValue(new Error('Some other error'));

    await ingestRssFeeds();

    // Should log error immediately without retries (or fewer retries if mixed)
    const warningCalls = (logger.warn as any).mock.calls;
    const retryMessages = warningCalls.filter((args: any[]) => args[0].includes('Retrying'));
    expect(retryMessages.length).toBe(0);
    
    const errorCalls = (logger.error as any).mock.calls;
    expect(errorCalls.length).toBeGreaterThan(0);
  });
});
