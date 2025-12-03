#!/usr/bin/env node
import { Command } from 'commander';
import { ingestRssFeeds } from './lib/ingest/rss-ingest.js';
import { ingestRecentPapers } from './lib/ingest/ads-ingest.js';
import { ingestPapersFromScix } from './lib/ingest/scix-ingest.js';
import { generateNewsletter } from './lib/newsletter/generator.js';
import { shareOnSlack, convertToSlackMrkdwn } from './lib/newsletter/slack.js';
import { logger } from './lib/logger.js';
import { pdfStyles } from './lib/newsletter/pdf-styles.js';
import fs from 'fs/promises';
import path from 'path';
import { mdToPdf } from 'md-to-pdf';

const program = new Command();

program
  .name('research-agent')
  .description('CLI for Research Agent tasks')
  .version('1.0.0');

program.command('ingest')
  .description('Ingest content from configured sources')
  .option('-r, --rss', 'Ingest RSS feeds')
  .option('-p, --papers', 'Ingest academic papers from ADS (Legacy)')
  .option('--scix', 'Ingest academic papers using SciX MCP')
  .option('-d, --days <number>', 'Days to look back for papers', '7')
  .action(async (options) => {
    try {
        const tasks: Promise<void>[] = [];
        
        // If no source flags provided, run all (default to RSS + legacy ADS if scix not specified?)
        // Or maybe default to RSS + SciX if configured?
        // For now, let's keep legacy behavior unless --scix is passed.
        const runAll = !options.rss && !options.papers && !options.scix;
        
        if (runAll || options.rss) {
            tasks.push(Promise.resolve().then(async () => {
                logger.info('Starting RSS ingestion...');
                await ingestRssFeeds();
            }));
        }
        
        if (options.scix) {
             tasks.push(Promise.resolve().then(async () => {
                logger.info('Starting Paper ingestion (SciX MCP)...');
                await ingestPapersFromScix(parseInt(options.days));
            }));
        } else if (runAll || options.papers) {
            tasks.push(Promise.resolve().then(async () => {
                logger.info('Starting Paper ingestion (Legacy ADS)...');
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
  .option('-o, --output <path>', 'Output file path (markdown)')
  .option('-s, --slack <channel>', 'Share to Slack channel (e.g. #research-updates)')
  .option('--pdf', 'Generate PDF export')
  .option('--slack-text', 'Generate Slack-compatible text file')
  .action(async (options) => {
      try {
          const days = parseInt(options.days);
          logger.info(`Generating newsletter for last ${days} days...`);
          const content = await generateNewsletter(days);
          
          let outputPath = options.output;
          const dateStr = new Date().toISOString().split('T')[0];
          
          if (!outputPath) {
              outputPath = path.resolve(process.cwd(), `newsletter-${dateStr}.md`);
          } else if (outputPath.endsWith('.md') === false) {
              // Ensure .md extension if not present or if user gave a directory/base name
              // But if user gave "foo.txt", we should probably respect it or append .md?
              // Let's assume user might provide just "report" -> report.md
              // Or let's just stick to the default logic if undefined.
              // The prompt asked for naming with dates.
              // If user provides -o, we use it. If not, we use date.
              // But user wants "all the naming should be with dates".
              // So if user DOES NOT provide output, we use date.
              // If user does provide output, we respect it, but maybe we should append date?
              // Let's stick to the default date-based name if -o is not provided.
              outputPath = path.resolve(process.cwd(), outputPath);
          } else {
              outputPath = path.resolve(process.cwd(), outputPath);
          }
          
          await fs.writeFile(outputPath, content, 'utf-8');
          logger.info(`Newsletter saved to ${outputPath}`);
          console.log(`\n✅ Newsletter generated: ${outputPath}`);

          if (options.pdf) {
              const pdfPath = outputPath.replace(/\.md$/, '.pdf');
              logger.info(`Generating PDF: ${pdfPath}`);
              await mdToPdf(
                  { content },
                  {
                      dest: pdfPath,
                      css: pdfStyles,
                      pdf_options: {
                          format: 'A4',
                          margin: {
                              top: '20mm',
                              right: '20mm',
                              bottom: '20mm',
                              left: '20mm',
                          },
                          printBackground: true,
                      },
                  }
              );
              console.log(`\n✅ PDF export: ${pdfPath}`);
          }

          if (options.slackText) {
              const slackPath = outputPath.replace(/\.md$/, '.slack.txt');
              const slackContent = convertToSlackMrkdwn(content);
              await fs.writeFile(slackPath, slackContent, 'utf-8');
              logger.info(`Slack text saved to ${slackPath}`);
              console.log(`\n✅ Slack-ready text export: ${slackPath}`);
          }

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
