import { WebClient } from '@slack/web-api';
import { config } from '../../config.js';
import { logger } from '../logger.js';

export async function shareOnSlack(markdownContent: string, channel: string = '#research-updates') {
    if (!config.SLACK_TOKEN) {
        logger.warn('SLACK_TOKEN not configured. Skipping Slack sharing.');
        return;
    }

    const client = new WebClient(config.SLACK_TOKEN);

    try {
        logger.info(`Sharing newsletter to Slack channel: ${channel}`);
        
        // Slack's block kit has a limit of 3000 chars per text block. 
        // We'll split by sections or just post as a simple message for now, 
        // or maybe upload as a snippet/file if it's too long.
        // Ideally, we post the TL;DR as a message and the full content as a thread or file.
        
        // Let's split into TL;DR and the rest.
        const parts = markdownContent.split('\n---');
        const tldr = parts[0] || markdownContent;
        const details = parts.slice(1).join('\n---');

        // Post TL;DR
        const result = await client.chat.postMessage({
            channel,
            text: "🚀 *Weekly Research Update*", // Fallback text
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🚀 Weekly Research Update"
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: tldr
                    }
                }
            ]
        });

        if (details && result.ts) {
            // Post details in thread
            // We might need to split details if it's too long
            const CHUNK_SIZE = 3000;
            const chunks = [];
            for (let i = 0; i < details.length; i += CHUNK_SIZE) {
                chunks.push(details.slice(i, i + CHUNK_SIZE));
            }

            for (const chunk of chunks) {
                await client.chat.postMessage({
                    channel,
                    thread_ts: result.ts,
                    text: chunk,
                    mrkdwn: true
                });
            }
            logger.info('Posted details in thread.');
        }

        logger.info('Successfully shared on Slack.');
    } catch (error) {
        logger.error('Failed to share on Slack', { error: String(error) });
        throw error;
    }
}
