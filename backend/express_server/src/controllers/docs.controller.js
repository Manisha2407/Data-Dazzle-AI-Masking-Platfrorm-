import fs from 'fs';
import path from 'path';
import prisma from '../db/prisma.js';
import { deleteDocument as esDeleteDocument, logAudit } from '../utils/elastic.js';
import { client, DOCUMENTS_INDEX } from '../utils/elastic.js';

const PAGE_SIZE = 9;

const getDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const search = req.query.search?.trim() || '';

    const where = {
      userId,
      ...(search && {
        filename: { contains: search, mode: 'insensitive' },
      }),
    };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * PAGE_SIZE,
        take:    PAGE_SIZE,
        select: {
          id:               true,
          filename:         true,
          fileType:         true,
          status:           true,
          totalEntities:    true,
          processingTimeMs: true,
          redactionMethod:  true,
          createdAt:        true,
          originalDeleted:  true,
          entityCounts:     true,
        },
      }),
      prisma.document.count({ where }),
    ]);

    return res.status(200).json({
      documents,
      pagination: {
        page,
        pageSize:   PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
        hasNext:    page < Math.ceil(total / PAGE_SIZE),
        hasPrev:    page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getDocumentById = async (req, res, next) => {
  try {
    const userId     = req.user.id;
    const documentId = parseInt(req.params.id);

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      include: {
        entities: {
          select: {
            entityType: true,
            confidence: true,
            startPos:   true,
            endPos:     true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(200).json({ document });
  } catch (err) {
    next(err);
  }
};

const getDocumentViewerData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const documentId = parseInt(req.params.id);

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        entities: {
          select: {
            entityType: true,
            confidence: true,
            startPos: true,
            endPos: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
      });
    }

    let redactedText = '';

    try {
      const esResponse = await client.get({
        index: DOCUMENTS_INDEX,
        id: String(document.id),
      });

      redactedText =
        esResponse._source?.redactedText || '';
    } catch (err) {
      console.error(
        `[ES] Failed to fetch viewer text for document ${document.id}:`,
        err.message
      );
    }

    return res.status(200).json({
      document: {
        ...document,
        redactedText,
      },
    });
  } catch (err) {
    next(err);
  }
};

const downloadOriginal = async (req, res, next) => {
  try {
    const userId     = req.user.id;
    const documentId = parseInt(req.params.id);

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: {
        filename:        true,
        originalFilePath: true,
        originalDeleted:  true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.originalDeleted) {
      return res.status(410).json({ error: 'Original file has been automatically deleted after 24 hours' });
    }

    if (!fs.existsSync(document.originalFilePath)) {
      return res.status(404).json({ error: 'Original file not found on disk' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(document.originalFilePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

const downloadRedacted = async (req, res, next) => {
  try {
    const userId     = req.user.id;
    const documentId = parseInt(req.params.id);

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: {
        filename:        true,
        redactedFilePath: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.redactedFilePath || !fs.existsSync(document.redactedFilePath)) {
      return res.status(404).json({ error: 'Redacted file not found' });
    }

    const ext      = path.extname(document.redactedFilePath).toLowerCase();
    const baseName = path.basename(document.filename, path.extname(document.filename));
    const downloadName = `redacted-${baseName}${ext}`;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(document.redactedFilePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const userId     = req.user.id;
    const documentId = parseInt(req.params.id);

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { originalFilePath: true, redactedFilePath: true, filename: true },
    });

    if (!document) return res.status(404).json({ error: 'Document not found' });

    if (document.originalFilePath && fs.existsSync(document.originalFilePath)) {
      fs.unlinkSync(document.originalFilePath);
    }
    if (document.redactedFilePath && fs.existsSync(document.redactedFilePath)) {
      fs.unlinkSync(document.redactedFilePath);
    }

    await prisma.documentEntity.deleteMany({ where: { documentId } });
    await prisma.document.delete({ where: { id: documentId } });
    await esDeleteDocument(documentId);
    await logAudit({
      userId,
      username:   req.user.username,
      action:     'DOCUMENT_DELETED',
      documentId,
      filename:   document.filename,
    });

    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export { getDocuments, getDocumentById, downloadOriginal, downloadRedacted, deleteDocument, getDocumentViewerData };