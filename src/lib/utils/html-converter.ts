import { marked } from 'marked';
import fs from 'fs/promises';
import { logger } from '../logger.js';

export async function convertMarkdownToHtml(mdPath: string): Promise<string> {
    const htmlPath = mdPath.replace(/\.md$/, '.html');
    
    try {
        logger.info(`Converting ${mdPath} to HTML...`);
        const mdContent = await fs.readFile(mdPath, 'utf-8');
        const htmlContent = await marked.parse(mdContent);
        
        const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter</title>
    <style>
        body { font-family: "Helvetica", "Arial", sans-serif; font-size: 16px; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; }
        h2 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 20px; }
        h3 { color: #34495e; margin-top: 15px; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
        code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: "Courier New", monospace; }
        blockquote { border-left: 4px solid #eee; padding-left: 15px; color: #7f8c8d; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
`;

        await fs.writeFile(htmlPath, fullHtml);
        logger.info(`HTML saved to ${htmlPath}`);
        return htmlPath;
    } catch (error) {
        logger.error('Failed to convert Markdown to HTML', error);
        throw error;
    }
}
