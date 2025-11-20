import axios, { AxiosInstance } from 'axios';
import { config } from '../../config.js';
import { logger } from '../logger.js';

export interface SearchOptions {
  patternType?: 'literal' | 'regexp' | 'structural';
}

export interface FileMatch {
  type: 'file';
  repository: string;
  path: string;
  url: string;
  content?: string;
  lineMatches?: Array<{
    line: number;
    preview: string;
  }>;
}

export interface SearchResponse {
  results: FileMatch[];
}

const SEARCH_QUERY = `
  query Search($query: String!, $patternType: SearchPatternType) {
    search(query: $query, version: V2, patternType: $patternType) {
      results {
        results {
          __typename
          ... on FileMatch {
            file {
              path
              url
              content
            }
            repository {
              name
            }
            lineMatches {
              preview
              lineNumber
            }
          }
        }
      }
    }
  }
`;

export class SourcegraphClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.SOURCEGRAPH_URL,
      headers: {
        Authorization: config.SOURCEGRAPH_TOKEN ? `token ${config.SOURCEGRAPH_TOKEN}` : '',
        'Content-Type': 'application/json',
      },
    });
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    this.ensureToken();

    const operation = async () => {
      const response = await this.client.post('/.api/graphql', {
        query: SEARCH_QUERY,
        variables: {
          query,
          patternType: options.patternType || 'literal',
        },
      });

      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
      }
      
      return response;
    };

    try {
      const response = await this.makeRequest(operation);
      const rawResults = response.data.data.search.results.results;
      const results: FileMatch[] = rawResults
        .filter((r: any) => r.__typename === 'FileMatch')
        .map((r: any) => ({
          type: 'file',
          repository: r.repository.name,
          path: r.file.path,
          url: new URL(r.file.url, config.SOURCEGRAPH_URL).toString(),
          content: r.file.content, // Note: Content might be truncated or missing depending on query
          lineMatches: r.lineMatches?.map((lm: any) => ({
            line: lm.lineNumber,
            preview: lm.preview,
          })),
        }));

      return { results };
    } catch (error) {
      this.handleError(error);
    }
  }

  async readFile(repository: string, path: string, revision: string = 'HEAD'): Promise<string> {
    this.ensureToken();

    const query = `
      query ReadFile($repo: String!, $rev: String!, $path: String!) {
        repository(name: $repo) {
          commit(rev: $rev) {
            blob(path: $path) {
              content
            }
          }
        }
      }
    `;

    const operation = async () => {
      const response = await this.client.post('/.api/graphql', {
        query,
        variables: {
          repo: repository,
          rev: revision,
          path,
        },
      });

      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
      }

      return response;
    };

    try {
      const response = await this.makeRequest(operation);
      const content = response.data.data.repository?.commit?.blob?.content;
      if (content === undefined) {
        throw new Error(`File not found: ${repository}@${revision}/${path}`);
      }

      return content;
    } catch (error) {
      this.handleError(error);
    }
  }

  private async makeRequest<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
    const MAX_RETRIES = config.API_MAX_RETRIES;
    const INITIAL_DELAY_MS = config.API_RETRY_DELAY;

    try {
      return await operation();
    } catch (error) {
      if (this.isTransientError(error) && retryCount < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
        logger.warn(`Sourcegraph API request failed. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`, { 
          error: error instanceof Error ? error.message : String(error) 
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(operation, retryCount + 1);
      }
      throw error;
    }
  }

  private isTransientError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Retry on network errors (no response) or 5xx/429 status codes
      return !error.response || (status !== undefined && (status >= 500 || status === 429));
    }
    return false;
  }

  private ensureToken() {
    if (!config.SOURCEGRAPH_TOKEN) {
      console.warn('SOURCEGRAPH_TOKEN is missing. Sourcegraph tools may fail for private repos.');
    }
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      const message = data?.error || error.message;
      throw new Error(`Sourcegraph API Error (${status}): ${JSON.stringify(message)}`);
    }
    throw error;
  }
}

export const sgClient = new SourcegraphClient();
