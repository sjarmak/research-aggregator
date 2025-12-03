import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InoreaderClient } from './client';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('InoreaderClient', () => {
  let client: InoreaderClient;
  const config = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token',
  };

  beforeEach(() => {
    fetchMock.mockReset();
    client = new InoreaderClient(config);
  });

  it('should refresh token when getting access token if not cached', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        scope: 'read',
      }),
    });

    // We can't access private methods directly in TS easily without casting to any or using brackets
    // but we can test a public method that calls it
    
    // Mock the stream contents call to succeed
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [],
        id: 'test-stream',
        title: 'Test Stream',
        updated: 1234567890,
      }),
    });

    await client.getStreamContents('user/123/state/com.google/reading-list');

    // Verify token refresh call
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://www.inoreader.com/oauth2/token', expect.objectContaining({
      method: 'POST',
      body: expect.any(URLSearchParams),
    }));

    // Verify stream fetch call used the new token
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/stream/contents/'), expect.objectContaining({
      headers: {
        Authorization: 'Bearer new-access-token',
      },
    }));
  });

  it('should use cached token if valid', async () => {
    // First call to prime the cache
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'cached-token',
        token_type: 'Bearer',
        expires_in: 3600, 
        refresh_token: 'ref-token',
        scope: 'read',
      }),
    });
    
    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
    });

    await client.getStreamContents('stream1');

    // Second call should not refresh token
    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
    });
    
    await client.getStreamContents('stream2');

    // Should have called token endpoint once, and content endpoint twice
    const tokenCalls = fetchMock.mock.calls.filter(call => call[0] === 'https://www.inoreader.com/oauth2/token');
    expect(tokenCalls.length).toBe(1);
  });
});
