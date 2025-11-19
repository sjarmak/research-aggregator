import axios, { AxiosInstance } from 'axios';
import { config } from '../../config.js';

export interface AdsSearchOptions {
  rows?: number;
  start?: number;
  sort?: string;
  fl?: string[];
}

export interface AdsPaper {
  id: string;
  bibcode: string;
  title?: string[];
  author?: string[];
  year?: string;
  pub?: string;
  abstract?: string;
  keyword?: string[];
  [key: string]: any;
}

export interface AdsSearchResponse {
  responseHeader: {
    status: number;
    QTime: number;
    params: any;
  };
  response: {
    numFound: number;
    start: number;
    docs: AdsPaper[];
  };
}

export class AdsClient {
  private client: AxiosInstance;

  constructor() {
    if (!config.ADS_API_TOKEN) {
      console.warn('ADS_API_TOKEN is not configured. ADS tools will fail if used.');
    }

    this.client = axios.create({
      baseURL: 'https://api.adsabs.harvard.edu/v1',
      headers: {
        Authorization: `Bearer ${config.ADS_API_TOKEN || ''}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async search(query: string, options: AdsSearchOptions = {}): Promise<AdsSearchResponse> {
    this.ensureToken();
    
    const fl = options.fl || ['id', 'bibcode', 'title', 'author', 'year', 'pub', 'abstract', 'keyword'];

    try {
      const response = await this.client.get<AdsSearchResponse>('/search/query', {
        params: {
          q: query,
          rows: options.rows || 10,
          start: options.start || 0,
          sort: options.sort || 'date desc',
          fl: fl.join(','),
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPaper(bibcode: string): Promise<AdsPaper | null> {
    const result = await this.search(`bibcode:${bibcode}`, { rows: 1 });
    if (result.response.docs.length > 0) {
      return result.response.docs[0];
    }
    return null;
  }

  async getLibraries(): Promise<any[]> {
    this.ensureToken();
    try {
      const response = await this.client.get('/biblib/libraries');
      return response.data.libraries || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getLibraryPapers(libraryId: string): Promise<AdsPaper[]> {
    this.ensureToken();
    try {
      // 1. Get the list of bibcodes in the library
      const libResponse = await this.client.get(`/biblib/libraries/${libraryId}`, {
        params: { rows: 100 } // Adjust limit as needed
      });
      
      const documents = libResponse.data.documents || [];
      if (documents.length === 0) return [];

      // 2. Fetch details for these bibcodes using the search API
      // The library API returns minimal info, we usually want the full metadata
      // We can construct a search query: bibcode:(A OR B OR C ...)
      const bibcodes = documents.map((doc: any) => doc).slice(0, 50); // Limit to 50 for now to avoid URL length issues
      
      if (bibcodes.length === 0) return [];

      const query = `bibcode:(${bibcodes.join(' OR ')})`;
      const searchResult = await this.search(query, { rows: bibcodes.length });
      return searchResult.response.docs;

    } catch (error) {
      this.handleError(error);
    }
  }

  private ensureToken() {
    if (!config.ADS_API_TOKEN) {
      throw new Error('ADS_API_TOKEN is missing. Please configure it in .env');
    }
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      const message = data?.error || error.message;
      throw new Error(`ADS API Error (${status}): ${JSON.stringify(message)}`);
    }
    throw error;
  }
}

export const adsClient = new AdsClient();
