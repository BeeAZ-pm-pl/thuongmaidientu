import { Router } from 'express';
import * as chatController from '../controllers/chatController';

const router = Router();

router.post('/session', chatController.getOrCreateSession);
router.get('/messages/:sessionId', chatController.getMessages);
router.post('/send', chatController.sendMessage);
router.post('/request-human', chatController.requestHuman);
router.post('/switch-mode', chatController.switchMode);
router.get('/ai-status', chatController.getAiStatus);

router.get('/admin/sessions', chatController.adminGetSessions);
router.post('/admin/reply', chatController.adminReply);

export default router;
