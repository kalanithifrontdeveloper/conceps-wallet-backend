const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kyc.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/verify', kycController.verifyAadhar);
router.get('/status', kycController.getKycStatus);

module.exports = router;