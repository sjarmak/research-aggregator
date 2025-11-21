import { WebClient } from '@slack/web-api';
import { config } from '../../config.js';
import { logger } from '../logger.js';

function convertToSlackMrkdwn(text: string): string {
    let slackText = text;
    
    // Convert links: [text](url) -> <url|text>
    slackText = slackText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');
    
    // Convert bold: **text** -> *text*
    slackText = slackText.replace(/\*\*([^*]+)\*\*/g, '*$1*');
    
    // Convert headers: ### Title -> *Title*
    slackText = slackText.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');
    
    // Convert list items: - item -> • item
    slackText = slackText.replace(/^\s*-\s/gm, '• ');

    return slackText;
}

export async function shareOnSlack(markdownContent: string, channel: string = '#research-updates') {
    if (!config.SLACK_TOKEN) {
        logger.warn('SLACK_TOKEN not configured. Skipping Slack sharing.');
        return;
    }

    const client = new WebClient(config.SLACK_TOKEN);

    try {
        logger.info(`Sharing newsletter to Slack channel: ${channel}`);
        
        // Convert content to Slack-friendly format
        const slackContent = convertToSlackMrkdwn(markdownContent);

        // Let's split into TL;DR and the rest.
        // Note: split logic might need adjustment if headers changed, 
        // but we kept the structure mostly text.
        // However, our converter changed '---' (hr) to '---'? It didn't touch it.
        
        const parts = slackContent.split('\n---');
        const tldr = parts[0] || slackContent;
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
