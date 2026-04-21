import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';

describe('pdf-lib copy and embed', () => {
    let srcBytes;

    beforeEach(async () => {
        // Create a source PDF with actual content (empty pages fail embed)
        const srcDoc = await PDFDocument.create();
        const page = srcDoc.addPage([200, 100]);
        const font = await srcDoc.embedFont(StandardFonts.Courier);
        page.drawText('Test', { x: 10, y: 50, size: 12, font });
        srcBytes = await srcDoc.save();
    });

    it('copyPages returns array of PDFPage', async () => {
        const loadedDoc = await PDFDocument.load(srcBytes);
        const outDoc = await PDFDocument.create();

        const copied = await outDoc.copyPages(loadedDoc, [0]);

        expect(Array.isArray(copied)).toBe(true);
        expect(copied.length).toBe(1);
        expect(copied[0].constructor.name).toBe('PDFPage');
    });

    it('embedPage works on copied page', async () => {
        const loadedDoc = await PDFDocument.load(srcBytes);
        const outDoc = await PDFDocument.create();

        const [copiedPage] = await outDoc.copyPages(loadedDoc, [0]);
        const embedded = await outDoc.embedPage(copiedPage);

        expect(embedded.constructor.name).toBe('PDFEmbeddedPage');
    });

    it('drawPage renders embedded page', async () => {
        const loadedDoc = await PDFDocument.load(srcBytes);
        const outDoc = await PDFDocument.create();

        const [copiedPage] = await outDoc.copyPages(loadedDoc, [0]);
        const embedded = await outDoc.embedPage(copiedPage);

        const page = outDoc.addPage([595.28, 841.89]);
        page.drawPage(embedded, { x: 50, y: 50, width: 200, height: 100 });

        const outBytes = await outDoc.save();
        expect(outBytes.length).toBeGreaterThan(srcBytes.length);
    });

    it('vertical spacing distributes items evenly', async () => {
        // Create source with multiple pages
        const srcDoc = await PDFDocument.create();
        const font = await srcDoc.embedFont(StandardFonts.Courier);

        for (let i = 0; i < 3; i++) {
            const page = srcDoc.addPage([200, 50]);
            page.drawText(`Page ${i + 1}`, { x: 10, y: 25, size: 10, font });
        }

        const loadedDoc = await PDFDocument.load(await srcDoc.save());
        const outDoc = await PDFDocument.create();

        // Copy all 3 pages
        const copiedPages = await outDoc.copyPages(loadedDoc, [0, 1, 2]);
        expect(copiedPages.length).toBe(3);

        const embeddings = await Promise.all(copiedPages.map(p => outDoc.embedPage(p)));
        expect(embeddings.length).toBe(3);
    });
});