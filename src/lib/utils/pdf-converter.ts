import { mdToPdf } from 'md-to-pdf';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../logger.js';

export async function convertMarkdownToPdf(mdPath: string): Promise<string> {
    const pdfPath = mdPath.replace(/\.md$/, '.pdf');
    
    try {
        logger.info(`Converting ${mdPath} to PDF...`);
        const pdf = await mdToPdf({ path: mdPath }, {
            pdf_options: {
                format: 'A4',
                margin: {
                    top: '20mm',
                    bottom: '20mm',
                    left: '20mm',
                    right: '20mm'
                },
                printBackground: true
            },
            launch_options: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            stylesheet: [
                `body { font-family: "Helvetica", "Arial", sans-serif; font-size: 12px; line-height: 1.5; color: #333; }`,
                `h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; }`,
                `h2 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 20px; }`,
                `h3 { color: #34495e; margin-top: 15px; }`,
                `a { color: #3498db; text-decoration: none; }`,
                `ul { padding-left: 20px; }`,
                `li { margin-bottom: 5px; }`,
                `code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: "Courier New", monospace; }`,
                `blockquote { border-left: 4px solid #eee; padding-left: 15px; color: #7f8c8d; }`
            ]
        });

        if (pdf) {
            await fs.writeFile(pdfPath, pdf.content);
            logger.info(`PDF saved to ${pdfPath}`);
            return pdfPath;
        } else {
            throw new Error('PDF generation returned empty content');
        }
    } catch (error) {
        logger.error('Failed to convert Markdown to PDF', error);
        throw error;
    }
}
