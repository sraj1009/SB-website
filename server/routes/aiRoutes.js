
import express from 'express';
import { chatWithHive } from '../controllers/aiController.js';

const router = express.Router();

router.post('/chat', chatWithHive);
router.get('/ping', (req, res) => res.json({ success: true, message: 'Bernie is awake!' }));

export default router;
