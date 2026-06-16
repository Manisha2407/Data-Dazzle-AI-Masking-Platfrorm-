import { Router } from 'express';
import verifyToken from '../middleware/verifyToken.js';
import { getAnalytics, getSizeVsTime, getUploadHeatmap } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/', verifyToken, getAnalytics);
router.get('/size-vs-time', verifyToken, getSizeVsTime);
router.get('/heatmap', verifyToken, getUploadHeatmap);

export default router;