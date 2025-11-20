import { describe, it, expect, beforeAll } from 'vitest';
import { SourcegraphClient } from './client.js';
import { config } from '../../config.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Only run if explicit flag is set and token is available
const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' && !!config.SOURCEGRAPH_TOKEN;

describe.skipIf(!runIntegration)('SourcegraphClient Integration', () => {
  let client: SourcegraphClient;

  beforeAll(() => {
    client = new SourcegraphClient();
  });

  it('should be able to search for this repository', async () => {
    // Searching for this specific file signature in the amp-sdk repo as a stable target
    // or just search for something broad in a public repo
    const query = 'repo:^github\\.com/sourcegraph/amp-sdk$ file:package.json';
    const result = await client.search(query);

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].repository).toBe('github.com/sourcegraph/amp-sdk');
    expect(result.results[0].path).toBe('package.json');
  });

  it('should be able to read a file from a public repository', async () => {
    const repo = 'github.com/sourcegraph/amp-sdk';
    const path = 'package.json';
    
    const content = await client.readFile(repo, path);
    expect(content).toContain('"name": "@sourcegraph/amp-sdk"');
  });

  it('should handle non-existent files gracefully', async () => {
    const repo = 'github.com/sourcegraph/amp-sdk';
    const path = 'non-existent-file.txt';
    
    await expect(client.readFile(repo, path)).rejects.toThrow(/File not found/);
  });
});
