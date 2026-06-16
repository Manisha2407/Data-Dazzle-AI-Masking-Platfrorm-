import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import PizZip from 'pizzip';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const REDACTED_DIR = 'uploads/redacted';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const buildUniqueName = (originalFilename, ext, userId) => {
  console.log('buildUniqueName params:', { originalFilename, ext, userId });
  const timestamp = Date.now();
  const baseName = path.basename(originalFilename, path.extname(originalFilename))
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 50);
  const name = `${userId}-${timestamp}-redacted-${baseName}${ext}`;
  console.log('generated name:', name);
  return name;
};

const writeTxt = (redactedText, originalFilename, userId) => {
  ensureDir(REDACTED_DIR);
  const filename = buildUniqueName(originalFilename, '.txt', userId);
  const filePath = path.join(REDACTED_DIR, filename);
  fs.writeFileSync(filePath, redactedText, 'utf-8');
  return filePath;
};

const writePdf = async (redactedText, originalFilename, userId) => {
  ensureDir(REDACTED_DIR);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const lineHeight = fontSize + 4;
  const margin = 50;

  const pageWidth = 595;
  const pageHeight = 842;
  const maxWidth = pageWidth - margin * 2;

  const lines = [];
  const safeText = redactedText.replace(/[^\x00-\x7F]/g, '');
  const paragraphs = safeText.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of lines) {
    if (y < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    if (line) {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  const filename = buildUniqueName(originalFilename, '.pdf', userId);
  const filePath = path.join(REDACTED_DIR, filename);
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
};

const writeDocx = (redactedText, originalFilename, originalFilePath, userId) => {
  ensureDir(REDACTED_DIR);

  const originalBuffer = fs.readFileSync(originalFilePath);
  const zip = new PizZip(originalBuffer);

  const documentXml = zip.file('word/document.xml').asText();

  const paragraphs = redactedText.split('\n');

  const newParaXml = paragraphs.map(para => {
    if (!para.trim()) {
      return '<w:p><w:pPr></w:pPr></w:p>';
    }
    const escaped = para
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return `<w:p><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
  }).join('');

  const newDocumentXml = documentXml.replace(
    /<w:body>[\s\S]*<\/w:body>/,
    `<w:body>${newParaXml}<w:sectPr/></w:body>`
  );

  zip.file('word/document.xml', newDocumentXml);

  const outputBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const filename = buildUniqueName(originalFilename, '.docx', userId);
  const filePath = path.join(REDACTED_DIR, filename);
  fs.writeFileSync(filePath, outputBuffer);
  return filePath;
};

const writeRedactedFile = async (redactedText, originalFilename, originalFilePath, userId) => {
  console.log('writeRedactedFile params:', { originalFilename, originalFilePath, userId });
  const ext = path.extname(originalFilename).toLowerCase();

  if (ext === '.pdf')  return await writePdf(redactedText, originalFilename, userId);
  if (ext === '.docx') return writeDocx(redactedText, originalFilename, originalFilePath, userId);
  return writeTxt(redactedText, originalFilename);
};

export default writeRedactedFile;