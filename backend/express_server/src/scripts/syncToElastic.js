import 'dotenv/config';
import prisma from '../db/prisma.js';
import extractText from '../utils/textext.js';
import { ensureIndex, indexDocument, indexEntities } from '../utils/elastic.js';

const syncAllDocuments = async () => {
  console.log('[Sync] Starting Elasticsearch sync...');
  await ensureIndex();

  const documents = await prisma.document.findMany({
    include: { entities: true },
  });

  console.log(`[Sync] Found ${documents.length} documents to sync`);

  let success = 0;  
  let failed  = 0;

  for (const doc of documents) {
    try {
      const text = await extractText(doc.redactedFilePath);
      await indexDocument(doc, text);
      await indexEntities(doc, doc.entities);
      success++;
      console.log(`[Sync] ✓ Document ${doc.id} — ${doc.filename}`);
    } catch {
      failed++;
      console.log(`[Sync] ✗ Document ${doc.id} failed`);
    }
  }

  console.log(`[Sync] Complete — ${success} success, ${failed} failed`);
  await prisma.$disconnect();
  process.exit(0);
};

syncAllDocuments();