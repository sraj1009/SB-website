import express from 'express';
import PrivacyController from '../../controllers/privacy.controller.js';
import { authenticate } from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/rbac.middleware.js';
import { Permission } from '../../../middleware/rbac.middleware.js';
import { validateInput } from '../../../middleware/security.middleware.js';
import { validationSchemas } from '../../../validators/security.validators.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// User consent management
router.post('/consent', PrivacyController.recordConsent);

router.get('/consent', PrivacyController.getConsentSummary);

router.put('/consent/withdraw', PrivacyController.withdrawConsent);

// Data subject rights
router.get('/export', PrivacyController.exportUserData);

router.delete('/data', PrivacyController.deleteUserData);

router.get('/access-log', PrivacyController.getDataAccessLog);

// User preferences
router.put('/preferences', PrivacyController.updatePreferences);

// Cookie preferences
router.get('/cookies', PrivacyController.getCookiePreferences);

router.put('/cookies', PrivacyController.updateCookiePreferences);

// Privacy policy
router.get('/policy', PrivacyController.getPrivacyPolicy);

// Admin routes
router.get('/admin/compliance-report', 
  requirePermission(Permission.MANAGE_SECURITY),
  PrivacyController.getComplianceReport
);

router.get('/admin/user/:userId/consent',
  requirePermission(Permission.READ_ALL_USERS),
  PrivacyController.getUserConsentData
);

router.post('/admin/data-breach',
  requirePermission(Permission.MANAGE_SECURITY),
  PrivacyController.recordDataBreach
);

export default router;
