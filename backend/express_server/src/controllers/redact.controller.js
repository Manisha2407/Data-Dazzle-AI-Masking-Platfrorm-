import path from 'path';
import fs from 'fs';
import prisma from '../db/prisma.js';
import validateFileSignature from '../utils/filesig.js';
import extractText from '../utils/textext.js';
import writeTextToFile from '../utils/filewriter.js';
import writeRedactedFile from '../utils/redactedFileWriter.js';
import { indexDocument, indexEntities, logAudit } from '../utils/elastic.js';
import { uploadFileToS3 } from '../utils/s3.js';

const DJANGO_URL = process.env.DJANGO_URL || 'http://django:8000';
const MAX_CHARACTERS = 2500000;

const callDjango = async (text, method, confidence, entities) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000000);

  try {
    const response = await fetch(`${DJANGO_URL}/api/redact/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, method, confidence, entities }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Django error: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const saveDocumentToDb = async ({
  userId,
  filename,
  fileType,
  fileSizeBytes,
  originalFilePath,
  redactedFilePath,
  redactionMethod,
  entityCounts,
  totalEntities,
  processingTimeMs,
  confidenceThreshold,
  entityTypesSelected,
  entities,
}) => {
  const document = await prisma.document.create({
    data: {
      userId,
      filename,
      fileType,
      fileSizeBytes,
      originalFilePath,
      redactedFilePath,
      redactionMethod,
      status: 'complete',
      entityCounts,
      totalEntities,
      processingTimeMs,
      confidenceThreshold,
      entityTypesSelected,
      originalDeleteAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  if (entities && entities.length > 0) {
    await prisma.documentEntity.createMany({
      data: entities.map((e) => ({
        documentId: document.id,
        entityText: e.text,
        entityType: e.type,
        startPos:   e.start,
        endPos:     e.end,
        confidence: e.confidence,
      })),
    });
  }

  await prisma.uploadTracking.create({
    data: { userId },
  });

  return document;
};

const getNextTextDocumentNumber = async (userId) => {
  const count = await prisma.document.count({
    where: {
      userId,
      fileType: 'txt',
      filename: { startsWith: 'Text_Document_' },
    },
  });
  return count + 1;
};

const redactDocument = async (req, res, next) => {
  const startTime = Date.now();
  let originalFilePath = null;

  try {
    const userId = req.user.id;

    const {
      method = 'mask',
      confidence = 70,
      entities = 'ALL',
    } = req.body;

    const isFileUpload = !!req.file;
    const isTextInput  = !!req.body.text;

    if (!isFileUpload && !isTextInput) {
      return res.status(400).json({ error: 'Provide a file or text input' });
    }

    let filename, fileType, fileSizeBytes, extractedText;

    if (isFileUpload) {
      const file = req.file;
      const ext  = path.extname(file.originalname).toLowerCase();
      originalFilePath = file.path;

      const isValid = validateFileSignature(file.path, ext);
      if (!isValid) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'File signature validation failed' });
      }

      extractedText = await extractText(file.path);
      filename = file.originalname;
      fileType = ext.replace('.', '');
      fileSizeBytes = file.size;

    } else {
      const text = req.body.text.trim();

      if (!text) {
        return res.status(400).json({ error: 'Text input is empty' });
      }

      if (text.length > MAX_CHARACTERS) {
        return res.status(400).json({ error: 'Text too large' });
      }

      const written = writeTextToFile(text, userId, 'text-input');
      originalFilePath = written.filePath;
      extractedText = text;

      const now = new Date();
      const dd  = String(now.getDate()).padStart(2, '0');
      const mon = now.toLocaleString('en-IN', { month: 'short' });
      const yyyy = now.getFullYear();
      const hh  = String(now.getHours()).padStart(2, '0');
      const mm  = String(now.getMinutes()).padStart(2, '0');

      filename = `Text_Input_${dd}-${mon}-${yyyy}_${hh}-${mm}.txt`;
      fileType = 'txt';
      fileSizeBytes = written.fileSizeBytes;
    }

    const entityTypesSelected = entities === 'ALL'
      ? 'ALL'
      : Array.isArray(entities) ? entities : entities.split(',');

    const djangoResult = await callDjango(
      extractedText,
      method,
      parseInt(confidence),
      entityTypesSelected,
    );

    const processingTimeMs = Date.now() - startTime;

    const redactedFilePath = await writeRedactedFile(
      djangoResult.redacted_text,
      filename,
      originalFilePath,
      userId,
    );

    const originalKey = `originals/${userId}/${path.basename(originalFilePath)}`;
    const redactedKey = `redacted/${userId}/${path.basename(redactedFilePath)}`;
      
    await uploadFileToS3(
      originalFilePath,
      originalKey,
      req.file?.mimetype || 'text/plain'
    );
    
    await uploadFileToS3(
      redactedFilePath,
      redactedKey,
      'application/octet-stream'
    );

    const document = await saveDocumentToDb({
      userId,
      filename,
      fileType,
      fileSizeBytes,
      originalFilePath,
      redactedFilePath,
      redactionMethod:     method,
      entityCounts:        djangoResult.entity_counts,
      totalEntities:       djangoResult.total_entities,
      processingTimeMs,
      confidenceThreshold: parseInt(confidence),
      entityTypesSelected,
      entities:            djangoResult.entities,
    });

    await indexDocument(document, djangoResult.redacted_text);
    await indexEntities(document, djangoResult.entities);
    await logAudit({
      userId,
      username:   req.user.username,
      action:     'DOCUMENT_REDACTED',
      documentId: document.id,
      filename:   document.filename,
      metadata: {
        fileType,
        totalEntities:    djangoResult.total_entities,
        processingTimeMs,
        redactionMethod:  method,
      },
    });

    return res.status(200).json({
      documentId:      document.id,
      status:          'complete',
      redactedText:    djangoResult.redacted_text,
      entities:        djangoResult.entities,
      entityCounts:    djangoResult.entity_counts,
      totalEntities:   djangoResult.total_entities,
      processingTimeMs,
      uploadedAt:      document.createdAt,
      filename:        document.filename,
    });

  } catch (err) {
    if (originalFilePath && fs.existsSync(originalFilePath)) {
      try { fs.unlinkSync(originalFilePath); } catch (_) {}
    }
    next(err);
  }
};

export default redactDocument;