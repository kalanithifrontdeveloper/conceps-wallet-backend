const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const razorpay = require('razorpay');

// Initialize Razorpay (if using)
const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Add money to wallet
exports.addMoney = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const userId = req.user.userId;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    if (amount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum deposit amount is ₹10'
      });
    }
    
    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      type: 'deposit',
      amount,
      status: 'pending',
      paymentMethod: paymentMethod || 'razorpay',
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    // For demo, we'll simulate successful payment
    // In production, integrate with actual payment gateway
    
    // Update wallet balance
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    await wallet.updateBalance(amount, 'deposit');
    
    // Update transaction status
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    await transaction.save();
    
    res.json({
      success: true,
      message: 'Money added successfully',
      data: {
        transaction,
        newBalance: wallet.balance
      }
    });
  } catch (error) {
    console.error('Add money error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add money'
    });
  }
};

// Withdraw money from wallet
exports.withdrawMoney = async (req, res) => {
  try {
    const { amount, bankAccountDetails } = req.body;
    const userId = req.user.userId;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is ₹100'
      });
    }
    
    // Check KYC verification
    const user = await User.findById(userId);
    if (!user.isKycVerified) {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required for withdrawal'
      });
    }
    
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      type: 'withdraw',
      amount,
      status: 'pending',
      paymentMethod: 'bank_transfer',
      transactionId: `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: { bankAccountDetails }
    });
    
    // Update wallet balance
    await wallet.updateBalance(amount, 'withdraw');
    
    // Update transaction status (in real app, would be after actual transfer)
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    await transaction.save();
    
    res.json({
      success: true,
      message: 'Withdrawal request processed successfully',
      data: {
        transaction,
        newBalance: wallet.balance
      }
    });
  } catch (error) {
    console.error('Withdraw money error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process withdrawal'
    });
  }
};

// Get passbook history with pagination
exports.getPassbookHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { type, status, startDate, endDate } = req.query;
    
    // Build filter
    let filter = { userId };
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Get transactions with aggregation for summary
    const [transactions, totalCount, summary] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
      Transaction.getTransactionSummary(userId)
    ]);
    
    const wallet = await Wallet.findOne({ userId });
    
    res.json({
      success: true,
      data: {
        transactions,
        summary: {
          currentBalance: wallet?.balance || 0,
          totalDeposited: wallet?.totalDeposited || 0,
          totalWithdrawn: wallet?.totalWithdrawn || 0,
          byType: summary
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalRecords: totalCount,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get passbook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history'
    });
  }
};

// Get wallet balance
exports.getWalletBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance'
    });
  }
};