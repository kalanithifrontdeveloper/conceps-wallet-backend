const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/add-money', walletController.addMoney);
router.post('/withdraw', walletController.withdrawMoney);
router.get('/passbook', walletController.getPassbookHistory);
router.get('/balance', walletController.getWalletBalance);

module.exports = router;