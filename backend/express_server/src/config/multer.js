import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.resolve('uploads/originals');;
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 50);
    const uid = req.user?.id || 'unknown';
    cb(null, `${uid}-${unique}-${baseName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter,
});

export default upload;