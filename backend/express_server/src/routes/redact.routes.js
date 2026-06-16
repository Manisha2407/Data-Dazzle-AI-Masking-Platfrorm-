import { Router } from 'express';
import upload from '../config/multer.js';
import uploadLimit from '../middleware/uploadlimit.js';
import verifyToken from '../middleware/verifyToken.js';
import redactDocument from '../controllers/redact.controller.js';

const router = Router();

const handleMulterError = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size exceeds 10MB limit' });
  }
  if (err.message?.startsWith('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

const multerMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
};

router.post(
  '/redact',
  verifyToken,
  uploadLimit,
  multerMiddleware,
  redactDocument,
);

export default router;