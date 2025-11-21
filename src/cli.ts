#!/usr/bin/env node
import { Command } from 'commander';
import { ingestRssFeeds } from './lib/ingest/rss-ingest.js';
import { ingestRecentPapers } from './lib/ingest/ads-ingest.js';
import { generateNewsletter } from './lib/newsletter/generator.js';
import { shareOnSlack } from './lib/newsletter/slack.js';
import { logger } from './lib/logger.js';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('research-agent')
  .description('CLI for Research Agent tasks')
  .version('1.0.0');

program.command('ingest')
  .description('Ingest content from configured sources')
  .option('-r, --rss', 'Ingest RSS feeds', true)
  .option('-p, --papers', 'Ingest academic papers from ADS', false)
  .option('-d, --days <number>', 'Days to look back for papers', '7')
  .action(async (options) => {
    try {
        const tasks: Promise<void>[] = [];
        
        if (options.rss) {
            tasks.push(Promise.resolve().then(async () => {
                logger.info('Starting RSS ingestion...');
                await ingestRssFeeds();
            }));
        }
        if (options.papers) {
            tasks.push(Promise.resolve().then(async () => {
                logger.info('Starting Paper ingestion...');
                await ingestRecentPapers(parseInt(options.days));
            }));
        }
        
        await Promise.all(tasks);
    } catch (error) {
        logger.error('Ingestion failed', { error: String(error) });
        process.exit(1);
    }
  });

program.command('generate')
  .description('Generate newsletter from ingested content')
  .option('-d, --days <number>', 'Days to look back', '7')
  .option('-o, --output <path>', 'Output file path')
  .option('-s, --slack <channel>', 'Share to Slack channel (e.g. #research-updates)')
  .action(async (options) => {
      try {
          const days = parseInt(options.days);
          logger.info(`Generating newsletter for last ${days} days...`);
          const content = await generateNewsletter(days);
          
          let outputPath = options.output;
          if (!outputPath) {
              const dateStr = new Date().toISOString().split('T')[0];
              outputPath = path.resolve(process.cwd(), `newsletter-${dateStr}.md`);
          } else {
              outputPath = path.resolve(process.cwd(), outputPath);
          }
          
          await fs.writeFile(outputPath, content, 'utf-8');
          logger.info(`Newsletter saved to ${outputPath}`);
          console.log(`\n✅ Newsletter generated: ${outputPath}`);

          if (options.slack) {
              await shareOnSlack(content, options.slack);
              console.log(`\n✅ Shared to Slack channel: ${options.slack}`);
          }

      } catch (error) {
          logger.error('Generation failed', { error: String(error) });
          process.exit(1);
      }
  });

program.parse();
