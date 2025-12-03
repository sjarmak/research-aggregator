import { logger } from '../logger.js';
import { InoreaderStreamResponse, InoreaderTokenResponse } from './types.js';

export class InoreaderClient {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: { clientId: string; clientSecret: string; refreshToken: string }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    logger.info('Refreshing Inoreader access token...');

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    });

    try {
      const response = await fetch('https://www.inoreader.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to refresh token: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as InoreaderTokenResponse;
      this.accessToken = data.access_token;
      // Set expiration slightly before actual expiry to be safe (e.g., 60 seconds)
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;

      // Update refresh token if a new one is returned
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      return this.accessToken;
    } catch (error) {
      logger.error('Error refreshing Inoreader token', error);
      throw error;
    }
  }

  async getStreamContents(streamId: string, options: { n?: number; continuation?: string; xt?: string } = {}): Promise<InoreaderStreamResponse> {
    const token = await this.getAccessToken();
    const encodedStreamId = encodeURIComponent(streamId);
    
    const params = new URLSearchParams();
    if (options.n) params.append('n', options.n.toString());
    if (options.continuation) params.append('c', options.continuation);
    if (options.xt) params.append('xt', options.xt);

    const url = `https://www.inoreader.com/reader/api/0/stream/contents/${encodedStreamId}?${params.toString()}`;

    logger.debug(`Fetching Inoreader stream: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch stream contents: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return (await response.json()) as InoreaderStreamResponse;
    } catch (error) {
      logger.error(`Error fetching stream contents for ${streamId}`, error);
      throw error;
    }
  }
  
  async getUserInfo(): Promise<any> {
      const token = await this.getAccessToken();
      const url = 'https://www.inoreader.com/reader/api/0/user-info';
      
      try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
          logger.error('Error fetching user info', error);
          throw error;
      }
  }
}
