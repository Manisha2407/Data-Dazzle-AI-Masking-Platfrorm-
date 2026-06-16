import cron from 'node-cron';
import fs from 'fs';
import prisma from '../db/prisma.js';

const deleteOriginalFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete file ${filePath}:`, err.message);
  }
};

const runAutoDelete = async () => {
  try {
    const now = new Date();

    const expiredDocuments = await prisma.document.findMany({
      where: {
        originalDeleted:  false,
        originalDeleteAt: { lte: now },
      },
      select: {
        id:               true,
        originalFilePath: true,
      },
    });

    if (expiredDocuments.length === 0) return;

    console.log(`[AutoDelete] Found ${expiredDocuments.length} file(s) to delete`);

    for (const doc of expiredDocuments) {
      deleteOriginalFile(doc.originalFilePath);

      await prisma.document.update({
        where: { id: doc.id },
        data: {
          originalDeleted:  true,
          originalFilePath: null,
        },
      });

      console.log(`[AutoDelete] Deleted original for document ${doc.id}`);
    }

  } catch (err) {
    console.error('[AutoDelete] Error during auto-delete job:', err.message);
  }
};

const startAutoDeleteJob = () => {
  console.log('[AutoDelete] Waiting for database before initial cleanup...');

  setTimeout(async () => {
    console.log('[AutoDelete] Initial cleanup run...');
    await runAutoDelete();
  }, 15000);

  cron.schedule('*/15 * * * *', async () => {
    const now = new Date().toISOString();
    console.log(`[AutoDelete] Running auto-delete check at ${now}`);
    
    await runAutoDelete();
  });

  console.log('[AutoDelete] Auto-delete job scheduled');
};

export default startAutoDeleteJob;