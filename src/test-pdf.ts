import { convertMarkdownToPdf } from './lib/utils/pdf-converter.js';
import path from 'path';

async function main() {
    try {
        const mdPath = path.resolve(process.cwd(), 'test-debug.md');
        
        // Create dummy MD file if not exists
        const fs = await import('fs/promises');
        await fs.writeFile(mdPath, '# Test PDF\n\nThis is a test link: [Google](https://google.com)', 'utf-8');
        
        console.log(`Converting ${mdPath}...`);
        const pdfPath = await convertMarkdownToPdf(mdPath);
        console.log(`Success! PDF at: ${pdfPath}`);
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
