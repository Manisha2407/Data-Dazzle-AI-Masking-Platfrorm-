import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const extractFromPdf = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDocument = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
};

const extractFromDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value.trim();
};

const extractFromTxt = (filePath) => {
  return fs.readFileSync(filePath, 'utf-8').trim();
};

const extractors = {
  '.pdf':  extractFromPdf,
  '.docx': extractFromDocx,
  '.txt':  extractFromTxt,
};

const extractText = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const extractor = extractors[ext];

  if (!extractor) {
    throw new Error(`No extractor available for file type: ${ext}`);
  }

  const text = await extractor(filePath);

  if (!text || text.length === 0) {
    throw new Error('No text content could be extracted from the file');
  }

  return text;
};

export default extractText;