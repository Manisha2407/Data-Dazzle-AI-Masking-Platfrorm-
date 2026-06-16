import { Router } from 'express';
import verifyToken from '../middleware/verifyToken.js';
import { searchDocuments, getEntitySuggestions, getAuditLogs } from '../controllers/search.controller.js';

const router = Router();

router.get('/',           verifyToken, searchDocuments);
router.get('/suggestions', verifyToken, getEntitySuggestions);
router.get('/audit',      verifyToken, getAuditLogs);

export default router;