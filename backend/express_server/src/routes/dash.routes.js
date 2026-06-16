import {Router} from 'express';
import verifyToken from '../middleware/verifyToken.js';
import {getStats,getUsage,getEntityBreakdown,getRecentDocuments} from '../controllers/dash.controller.js';

const router = Router();

router.get('/stats',             verifyToken, getStats);
router.get('/usage',             verifyToken, getUsage);
router.get('/entity-breakdown',  verifyToken, getEntityBreakdown);
router.get('/recent-documents',  verifyToken, getRecentDocuments);

export default router;