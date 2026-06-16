import { Router } from 'express';
import verifyToken from '../middleware/verifyToken.js';
import {
  updateUsername,
  updateEmail,
  updatePassword,
  deleteAccount,
  deleteAllDocuments,
  getPreferences,
  updatePreferences,
  getAccountInfo,
} from '../controllers/settings.controller.js';

const router = Router();

router.get('/',                  verifyToken, getAccountInfo);
router.put('/username',          verifyToken, updateUsername);
router.put('/email',             verifyToken, updateEmail);
router.put('/password',          verifyToken, updatePassword);
router.delete('/account',        verifyToken, deleteAccount);
router.delete('/documents',      verifyToken, deleteAllDocuments);
router.get('/preferences',       verifyToken, getPreferences);
router.put('/preferences',       verifyToken, updatePreferences);

export default router;