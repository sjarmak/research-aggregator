
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

export async function scrapeTLDR(): Promise<ScrapedArticle[]> {
    const archiveUrl = 'https://tldr.tech/tech/archives';
    try {
        // 1. Get the list of recent issues
        const { data: archiveData } = await axios.get(archiveUrl, {
            headers: { 'User-Agent': 'ResearchAgent/1.0' },
            timeout: 5000
        });
        const $archive = cheerio.load(archiveData);
        const issueLinks: string[] = [];
        
        // Find links to issues. Usually /tech/YYYY-MM-DD
        $archive('a[href^="/tech/20"]').slice(0, 3).each((i, el) => {
            const href = $archive(el).attr('href');
            if (href) issueLinks.push(`https://tldr.tech${href}`);
        });

        const articles: ScrapedArticle[] = [];

        // 2. Process each issue
        for (const link of issueLinks) {
            try {
                const { data: issueData } = await axios.get(link, {
                    headers: { 'User-Agent': 'ResearchAgent/1.0' },
                    timeout: 5000
                });
                const $ = cheerio.load(issueData);
                
                // Extract date from title or URL
                // URL: https://tldr.tech/tech/2025-11-11
                const dateMatch = link.match(/(\d{4}-\d{2}-\d{2})/);
                const issueDate = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

                // 3. Extract Stories
                // Structure: <h3><a href="...">Title</a></h3> <p>Summary</p>
                
                const h3s = $('h3');
                
                h3s.each((i, el) => {
                    const $h3 = $(el);
                    let $a = $h3.find('a');
                    
                    // Handle case where h3 is inside a (e.g. <a href...><h3>Title</h3></a>)
                    if ($a.length === 0 && $h3.parent().is('a')) {
                        $a = $h3.parent();
                    }

                    if ($a.length > 0) {
                        const title = $h3.text().trim(); // or $a.text() if h3 is inside
                        const url = $a.attr('href');
                        
                        // Summary extraction
                        let summary = '';
                        
                        // Case 1: Summary is in .newsletter-html sibling (seen in recent TLDR structure)
                        // <a ...><h3>...</h3></a> <div class="newsletter-html">...</div>
                        const $container = $a.parent(); // potentially <article>
                        const $newsletterHtml = $container.find('.newsletter-html');
                        
                        if ($newsletterHtml.length > 0) {
                            summary = $newsletterHtml.text().trim();
                        } else {
                             // Case 2: Older structure or fallback
                             // Search next siblings
                             let next = $a.next();
                             while (next.length && !next.is('h3') && !next.is('h2') && !next.is('header')) {
                                if (next.is('p') || next.is('div')) {
                                    summary += next.text().trim() + ' ';
                                }
                                next = next.next();
                             }
                        }

                        if (title && url && 
                            !url.includes('advertise') && 
                            !url.includes('sponsor') &&
                            !title.toLowerCase().includes('(sponsor)')) {
                            articles.push({
                                title,
                                url,
                                contentSnippet: summary.trim(),
                                isoDate: issueDate,
                                author: 'TLDR'
                            });
                        }
                    }
                });

            } catch (err) {
                logger.error(`Failed to scrape TLDR issue ${link}`, { error: String(err) });
            }
        }
        
        return articles;

    } catch (error) {
        logger.error('Failed to scrape TLDR archives', { error: String(error) });
        return [];
    }
}

export async function scrapeProgrammingDigest(): Promise<ScrapedArticle[]> {
    // https://programmingdigest.net/newsletters
    const archiveUrl = 'https://programmingdigest.net/newsletters';
    try {
        const { data: archiveData } = await axios.get(archiveUrl, {
            headers: { 'User-Agent': 'ResearchAgent/1.0' },
            timeout: 5000
        });
        const $archive = cheerio.load(archiveData);
        const issueLinks: string[] = [];

        // Find recent issues
        // Links like /newsletters/2159-game-design-is-simple-actually
        $archive('a[href^="/newsletters/"]').slice(0, 2).each((i, el) => {
            const href = $archive(el).attr('href');
            if (href) issueLinks.push(`https://programmingdigest.net${href}`);
        });

        const articles: ScrapedArticle[] = [];

        for (const link of issueLinks) {
            try {
                const { data: issueData } = await axios.get(link, {
                    headers: { 'User-Agent': 'ResearchAgent/1.0' },
                    timeout: 5000
                });
                const $ = cheerio.load(issueData);
                
                // Date might be in the header
                // <span class="date">...</span>
                // or we can infer from "Week X 2025"
                // Let's assume current ingestion time if not found, or try to parse.
                // The archive list usually has dates.
                const issueDate = new Date().toISOString(); // Fallback

                // Structure: Lists of links.
                // Usually <p><a href="...">Title</a><br>Summary</p>
                // Or <li>...</li>
                
                // Programming Digest usually uses a list of items.
                // Inspection required to be precise, but let's try a generic "find links in main content"
                // The main content is usually in a specific container.
                
                // Let's assume standard "Item" structure:
                // Item Title (Link)
                // Summary
                
                $('li, p').each((i, el) => {
                    const $el = $(el);
                    const $a = $el.find('a').first(); // Primary link
                    
                    if ($a.length > 0) {
                        const title = $a.text().trim();
                        const url = $a.attr('href');
                        // Summary is the text of the li/p minus the link text
                        const summary = $el.text().replace(title, '').trim();
                        
                        if (title && url && summary.length > 20 && !url.startsWith('/')) {
                            articles.push({
                                title,
                                url,
                                contentSnippet: summary,
                                isoDate: issueDate,
                                author: 'Programming Digest'
                            });
                        }
                    }
                });

            } catch (err) {
                logger.error(`Failed to scrape Programming Digest issue ${link}`, { error: String(err) });
            }
        }

        return articles;
    } catch (error) {
        logger.error('Failed to scrape Programming Digest', { error: String(error) });
        return [];
    }
}

export async function scrapeAugmentCode(): Promise<ScrapedArticle[]> {
    const url = 'https://www.augmentcode.com/blog';
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'ResearchAgent/1.0' },
            timeout: 5000
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
            headers: { 'User-Agent': 'ResearchAgent/1.0' },
            timeout: 5000
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
            headers: { 'User-Agent': 'ResearchAgent/1.0' },
            timeout: 5000
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
