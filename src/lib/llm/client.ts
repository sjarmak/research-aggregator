import axios from 'axios';
import { config } from '../../config.js';
import { logger } from '../logger.js';

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Cannot perform synthesis.');
  }

  try {
    logger.info('Generating LLM completion...');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No choices returned from LLM');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    const msg = axios.isAxiosError(error) 
        ? `LLM request failed: ${error.message} (${error.response?.status}) - ${JSON.stringify(error.response?.data)}`
        : `LLM request failed: ${String(error)}`;
        
    logger.error(msg);
    throw new Error(msg);
  }
}
