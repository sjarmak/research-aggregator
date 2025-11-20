import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
// Mock config before importing client
vi.mock('../../config.js', async () => {
  const actual = await vi.importActual<typeof import('../../config.js')>('../../config.js');
  return {
    ...actual,
    config: {
      ...actual.config,
      API_RETRY_DELAY: 1, // Speed up tests
    },
  };
});

import { SourcegraphClient } from './client.js';
import { config } from '../../config.js';

describe('SourcegraphClient', () => {
  let client: SourcegraphClient;
  const baseUrl = config.SOURCEGRAPH_URL;

  beforeEach(() => {
    client = new SourcegraphClient();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('should return results on success', async () => {
      const mockResponse = {
        data: {
          search: {
            results: {
              results: [
                {
                  __typename: 'FileMatch',
                  repository: { name: 'repo1' },
                  file: {
                    path: 'path/to/file',
                    url: '/repo1/-/blob/path/to/file',
                    content: 'some content',
                  },
                  lineMatches: [],
                },
              ],
            },
          },
        },
      };

      nock(baseUrl)
        .post('/.api/graphql')
        .reply(200, { data: mockResponse.data });

      const result = await client.search('test query');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].repository).toBe('repo1');
    });

    it('should throw on GraphQL errors', async () => {
      nock(baseUrl)
        .post('/.api/graphql')
        .reply(200, {
          errors: [{ message: 'Some GraphQL error' }],
        });

      await expect(client.search('test query')).rejects.toThrow('GraphQL Error');
    });

    it('should retry on 500 errors', async () => {
        // We need to override the retry delay to avoid slow tests
        // Since config is a singleton, we can't easily change it without mocking the module.
        // However, we can just accept the delay or mock the timer.
        // Using vi.useFakeTimers() might be complex with axios/nock.
        // Let's just mock the config module for this test file if we can, or just live with 1s delay if it's only a few retries.
        // Actually, let's just mock the logger to verify retries happened.
        
        // Mocking config would be better.
        
        nock(baseUrl)
          .post('/.api/graphql')
          .reply(500)
          .post('/.api/graphql')
          .reply(200, { data: { search: { results: { results: [] } } } });

        const result = await client.search('test query');
        expect(result.results).toEqual([]);
    });

    it('should retry on 429 errors', async () => {
        nock(baseUrl)
          .post('/.api/graphql')
          .reply(429)
          .post('/.api/graphql')
          .reply(200, { data: { search: { results: { results: [] } } } });

        const result = await client.search('test query');
        expect(result.results).toEqual([]);
    });

    it('should fail after max retries', async () => {
        // Mock 4 failures (default max retries is 3, so 1 initial + 3 retries = 4 requests total)
        nock(baseUrl)
          .post('/.api/graphql')
          .times(4) 
          .reply(500);

        await expect(client.search('test query')).rejects.toThrow('Sourcegraph API Error (500)');
    });
  });

  describe('readFile', () => {
      it('should return file content', async () => {
          const mockResponse = {
              data: {
                  repository: {
                      commit: {
                          blob: {
                              content: 'file content'
                          }
                      }
                  }
              }
          };

          nock(baseUrl)
            .post('/.api/graphql')
            .reply(200, { data: mockResponse.data });

          const content = await client.readFile('repo', 'file');
          expect(content).toBe('file content');
      });

      it('should throw if file not found', async () => {
           const mockResponse = {
              data: {
                  repository: {
                      commit: {
                          blob: null
                      }
                  }
              }
          };

          nock(baseUrl)
            .post('/.api/graphql')
            .reply(200, { data: mockResponse.data });
            
          await expect(client.readFile('repo', 'file')).rejects.toThrow('File not found');
      });
  });
});
