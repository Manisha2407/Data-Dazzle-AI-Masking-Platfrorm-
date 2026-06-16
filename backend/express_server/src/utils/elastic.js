import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
});

const DOCUMENTS_INDEX = 'datadazzle_documents';
const ENTITIES_INDEX  = 'datadazzle_entities';
const AUDIT_INDEX     = 'datadazzle_audit';

const calculateSensitivityScore = (entityCounts) => {
  if (!entityCounts) return 0;
  const weights = {
    AADHAAR: 10, PAN: 10, CREDIT_CARD: 10, BANK_ACCOUNT: 9,
    IFSC_CODE: 8, CRYPTO: 8, PHONE_NUMBER: 7, EMAIL_ADDRESS: 6,
    PERSON: 5, LOCATION: 4, PINCODE: 3, DATE_TIME: 2, ORG: 2,
    IP_ADDRESS: 3, MAC_ADDRESS: 3, URL: 1, DOMAIN: 1,
  };
  let score = 0;
  for (const [type, count] of Object.entries(entityCounts)) {
    score += (weights[type] || 1) * Math.min(count, 10);
  }
  return Math.min(Math.round(score / 10), 100);
};

const ensureIndex = async () => {
  try {
    const docExists = await client.indices.exists({ index: DOCUMENTS_INDEX });
    if (!docExists) {
      await client.indices.create({
        index: DOCUMENTS_INDEX,
        mappings: {
          properties: {
            documentId:          { type: 'integer' },
            userId:              { type: 'integer' },
            filename:            { type: 'text', fields: { keyword: { type: 'keyword' } } },
            fileType:            { type: 'keyword' },
            fileSizeBytes:       { type: 'long' },
            redactionMethod:     { type: 'keyword' },
            status:              { type: 'keyword' },
            totalEntities:       { type: 'integer' },
            processingTimeMs:    { type: 'integer' },
            confidenceThreshold: { type: 'integer' },
            sensitivityScore:    { type: 'integer' },
            entityCounts:        { type: 'object', dynamic: true },
            entityTypesSelected: { type: 'keyword' },
            originalDeleted:     { type: 'boolean' },
            createdAt:           { type: 'date' },
            redactedText:        { type: 'text', analyzer: 'english' },
          },
        },
      });
      console.log(`[ES] Index "${DOCUMENTS_INDEX}" created`);
    }

    const entExists = await client.indices.exists({ index: ENTITIES_INDEX });
    if (!entExists) {
      await client.indices.create({
        index: ENTITIES_INDEX,
        mappings: {
          properties: {
            documentId:  { type: 'integer' },
            userId:      { type: 'integer' },
            filename:    { type: 'text', fields: { keyword: { type: 'keyword' } } },
            fileType:    { type: 'keyword' },
            entityText:  { type: 'text', fields: { keyword: { type: 'keyword' } } },
            entityType:  { type: 'keyword' },
            confidence:  { type: 'float' },
            startPos:    { type: 'integer' },
            endPos:      { type: 'integer' },
            createdAt:   { type: 'date' },
          },
        },
      });
      console.log(`[ES] Index "${ENTITIES_INDEX}" created`);
    }

    const auditExists = await client.indices.exists({ index: AUDIT_INDEX });
    if (!auditExists) {
      await client.indices.create({
        index: AUDIT_INDEX,
        mappings: {
          properties: {
            userId:     { type: 'integer' },
            username:   { type: 'keyword' },
            action:     { type: 'keyword' },
            documentId: { type: 'integer' },
            filename:   { type: 'keyword' },
            metadata:   { type: 'object', dynamic: true },
            timestamp:  { type: 'date' },
          },
        },
      });
      console.log(`[ES] Index "${AUDIT_INDEX}" created`);
    }
  } catch (err) {
    console.error('[ES] Failed to ensure indices:', err.message);
  }
};

const indexDocument = async (document, redactedText) => {
  try {
    const sensitivityScore = calculateSensitivityScore(document.entityCounts);
    await client.index({
      index: DOCUMENTS_INDEX,
      id:    String(document.id),
      document: {
        documentId:          document.id,
        userId:              document.userId,
        filename:            document.filename,
        fileType:            document.fileType,
        fileSizeBytes:       document.fileSizeBytes ?? 0,
        redactionMethod:     document.redactionMethod,
        status:              document.status,
        totalEntities:       document.totalEntities ?? 0,
        processingTimeMs:    document.processingTimeMs ?? 0,
        confidenceThreshold: document.confidenceThreshold,
        sensitivityScore,
        entityCounts:        document.entityCounts ?? {},
        entityTypesSelected: document.entityTypesSelected ?? [],
        originalDeleted:     document.originalDeleted ?? false,
        createdAt:           document.createdAt,
        redactedText:        redactedText ?? '',
      },
    });
  } catch (err) {
    console.error(`[ES] Failed to index document ${document.id}:`, err.message);
    throw err
  }
};

const indexEntities = async (document, entities) => {
  if (!entities || entities.length === 0) return;

  try {
    const BATCH_SIZE = 500;
    for (let i = 0; i < entities.length; i += BATCH_SIZE) {
      const batch = entities.slice(i, i + BATCH_SIZE);
      const operations = batch.flatMap(e => [
        { index: { _index: ENTITIES_INDEX } },
        {
          documentId: document.id,
          userId:     document.userId,
          filename:   document.filename,
          fileType:   document.fileType,
          entityText: e.entityText || e.text,
          entityType: e.entityType || e.type,
          confidence: e.confidence ?? 1.0,
          startPos:   e.startPos ?? e.start ?? 0,
          endPos:     e.endPos   ?? e.end   ?? 0,
          createdAt:  document.createdAt,
        },
      ]);
      await client.bulk({ operations });
    }
  } catch (err) {
    console.error(`[ES] Failed to index entities for document ${document.id}:`, err.message);
  }
};

const logAudit = async ({ userId, username, action, documentId, filename, metadata }) => {
  try {
    await client.index({
      index: AUDIT_INDEX,
      document: {
        userId,
        username,
        action,
        documentId: documentId ?? null,
        filename:   filename   ?? null,
        metadata:   metadata   ?? {},
        timestamp:  new Date(),
      },
    });
  } catch (err) {
    console.error('[ES] Failed to log audit:', err.message);
  }
};

const deleteDocument = async (documentId) => {
  try {
    await client.delete({ index: DOCUMENTS_INDEX, id: String(documentId) });
  } catch (err) {
    if (err.meta?.statusCode !== 404) {
      console.error(`[ES] Failed to delete document ${documentId}:`, err.message);
    }
  }

  try {
    await client.deleteByQuery({
      index: ENTITIES_INDEX,
      query: { term: { documentId } },
    });
  } catch (err) {
    console.error(`[ES] Failed to delete entities for document ${documentId}:`, err.message);
  }
};

const deleteUserDocuments = async (userId) => {
  try {
    await client.deleteByQuery({
      index: DOCUMENTS_INDEX,
      query: { term: { userId } },
    });
    await client.deleteByQuery({
      index: ENTITIES_INDEX,
      query: { term: { userId } },
    });
  } catch (err) {
    console.error(`[ES] Failed to delete user ${userId} documents:`, err.message);
  }
};

export {
  client,
  DOCUMENTS_INDEX,
  ENTITIES_INDEX,
  AUDIT_INDEX,
  ensureIndex,
  indexDocument,
  indexEntities,
  logAudit,
  deleteDocument,
  deleteUserDocuments,
  calculateSensitivityScore,
};