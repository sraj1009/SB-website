import express from 'express';
import { chat } from '../controllers/assistantController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Chat endpoint - optional authentication (works for both guests and logged-in users)
router.post('/chat', optionalAuth, chat);

export default router;
