
import * as cheerio from 'cheerio';
import axios from 'axios';
import { logger } from '../logger.js';

export interface ScrapedArticle {
    title: string;
    url: string;
    contentSnippet?: string;
    isoDate?: string;
    author?: string;
}

export async function scrapeAugmentCode(): Promise<ScrapedArticle[]> {
    const url = 'https://www.augmentcode.com/blog';
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'ResearchAgent/1.0' }
        });
        const $ = cheerio.load(data);
        const articles: ScrapedArticle[] = [];

        // Based on inspection: links with href starting with /blog/ and containing card structure
        $('a[href^="/blog/"]').each((i, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            const fullUrl = href ? (href.startsWith('http') ? href : `https://www.augmentcode.com${href}`) : '';
            
            // Title seems to be in h2 with class h6 or div data-slot="card-title"
            // The link wraps the card div in some cases or is inside.
            // From curl output: <a href="/blog/..." ...><div data-slot="card">... <h2 class="h6">Title</h2> ... </div></a>
            const title = $el.find('h2').text().trim() || $el.find('[data-slot="card-title"]').text().trim();
            
            // Date in card-footer
            const dateStr = $el.find('[data-slot="card-footer"] p').last().text().trim();
            
            if (title && fullUrl) {
                articles.push({
                    title,
                    url: fullUrl,
                    isoDate: dateStr ? new Date(dateStr).toISOString() : undefined,
                    contentSnippet: title // Summary not always available on index
                });
            }
        });

        return articles;
    } catch (error) {
        logger.error('Failed to scrape Augment Code', { error: String(error) });
        return [];
    }
}

export async function scrapeGreptile(): Promise<ScrapedArticle[]> {
    const url = 'https://www.greptile.com/blog';
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'ResearchAgent/1.0' }
        });
        const $ = cheerio.load(data);
        const articles: ScrapedArticle[] = [];

        // From curl: <a href="/blog/..."><h3>Title ...</h3></a>
        $('a[href^="/blog/"]').each((i, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            const fullUrl = href ? (href.startsWith('http') ? href : `https://www.greptile.com${href}`) : '';
            
            const titleText = $el.find('h3').text().trim();
            // Title text might include author/date sometimes if formatted strangely, but usually h3 is title.
            // The curl output showed: "Title • Author" inside text or similar?
            // "Sandboxing agents... • Abhinav Hampiholi"
            
            if (titleText && fullUrl) {
                const [cleanTitle, author] = titleText.split('•').map(s => s.trim());
                
                articles.push({
                    title: cleanTitle,
                    url: fullUrl,
                    author: author,
                    // Date isn't always obvious in the list, maybe inside?
                    // We'll skip date if not found, ingestion will use now() or we can try to parse.
                });
            }
        });

        return articles;
    } catch (error) {
        logger.error('Failed to scrape Greptile', { error: String(error) });
        return [];
    }
}

export async function scrapeQodo(): Promise<ScrapedArticle[]> {
    const url = 'https://www.qodo.ai/blog/';
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'ResearchAgent/1.0' }
        });
        const $ = cheerio.load(data);
        const articles: ScrapedArticle[] = [];

        // article.post-tile
        $('article.post-tile').each((i, el) => {
            const $el = $(el);
            const titleLink = $el.find('a.post-tile__heading-link');
            const title = $el.find('.post-tile__heading').text().trim();
            const href = titleLink.attr('href');
            
            const dateStr = $el.find('.post-tile__date').text().trim();
            const author = $el.find('.post-tile__author-name').text().trim();
            const excerpt = $el.find('.post-tile__excerpt').text().trim();

            if (title && href) {
                articles.push({
                    title,
                    url: href,
                    isoDate: dateStr ? new Date(dateStr).toISOString() : undefined,
                    author,
                    contentSnippet: excerpt
                });
            }
        });

        return articles;
    } catch (error) {
        logger.error('Failed to scrape Qodo', { error: String(error) });
        return [];
    }
}
