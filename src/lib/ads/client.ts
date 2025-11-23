import axios, { AxiosInstance } from 'axios';
import { config } from '../../config.js';
import { logger } from '../logger.js';

export interface AdsPaper {
  bibcode: string;
  title: string[];
  author: string[];
  abstract: string;
  year: string;
  pub: string;
  pubdate: string;
  keyword?: string[];
  id: string;
}

export interface AdsResponse {
  response: {
    numFound: number;
    start: number;
    docs: AdsPaper[];
  };
}

export class AdsClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.adsabs.harvard.edu/v1',
      headers: {
        Authorization: `Bearer ${config.ADS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async search(query: string, rows: number = 10, sort: string = 'date desc'): Promise<AdsPaper[]> {
    if (!config.ADS_TOKEN) {
      logger.warn('ADS_TOKEN is missing. Skipping ADS search.');
      return [];
    }

    try {
      logger.info(`Executing ADS search: ${query}`);
      const response = await this.client.get<AdsResponse>('/search/query', {
        params: {
          q: query,
          fl: 'id,bibcode,title,author,abstract,year,pub,pubdate,keyword',
          rows: rows,
          sort: sort,
        },
      });

      return response.data.response.docs;
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? `ADS API Error: ${error.message} (${error.response?.status})`
        : `ADS Error: ${String(error)}`;
      logger.error(msg);
      throw new Error(msg);
    }
  }
}

export const adsClient = new AdsClient();
