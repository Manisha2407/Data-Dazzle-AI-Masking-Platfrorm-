import fs from 'fs';
import path from 'path';

const ORIGINALS_DIR = 'uploads/originals';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const writeTextToFile = (text, userId, originalFilename = 'input') => {
  ensureDir(ORIGINALS_DIR);

  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const baseName = path.basename(originalFilename, path.extname(originalFilename))
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 50);
  const filename = `${userId}-${unique}-${baseName}.txt`;
  const filePath = path.join(ORIGINALS_DIR, filename);

  fs.writeFileSync(filePath, text, 'utf-8');

  return {
    filePath,
    filename,
    fileSizeBytes: Buffer.byteLength(text, 'utf-8'),
  };
};

export default writeTextToFile;