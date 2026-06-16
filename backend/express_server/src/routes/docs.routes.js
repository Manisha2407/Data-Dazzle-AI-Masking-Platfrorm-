import {Router} from 'express';
import verifyToken from '../middleware/verifyToken.js';
import {getDocuments,getDocumentById,downloadOriginal,downloadRedacted,deleteDocument, getDocumentViewerData} from '../controllers/docs.controller.js';

const router = Router();

router.get('/',                       verifyToken, getDocuments);
router.get('/:id',                    verifyToken, getDocumentById);
router.get('/:id/viewer',             verifyToken, getDocumentViewerData);
router.get('/:id/download/original',  verifyToken, downloadOriginal);
router.get('/:id/download/redacted',  verifyToken, downloadRedacted);
router.delete('/:id',                 verifyToken, deleteDocument);

export default router;