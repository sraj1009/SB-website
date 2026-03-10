import express from 'express';
import { uploadImage, deleteFile, upload } from '../../../controllers/uploadController.js';
import { authenticate } from '../../../middleware/auth.js';
import adminOnlyMiddleware from '../../../middleware/adminOnly.js';

const router = express.Router();

// All upload routes require admin authentication
router.use(authenticate);
router.use(adminOnlyMiddleware);

// Upload single image
router.post('/image', upload.single('image'), uploadImage);

// Delete file
router.delete('/:filename', deleteFile);

export default router;
