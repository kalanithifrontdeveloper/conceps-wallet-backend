const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'refund', 'bonus'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'bank_transfer', 'upi'],
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
  completedAt: Date
}, {
  timestamps: true
});

// Composite index for efficient queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, type: 1 });

// Aggregate function for transaction summary
transactionSchema.statics.getTransactionSummary = async function(userId) {
  return await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), status: 'completed' } },
    { $group: {
      _id: '$type',
      totalAmount: { $sum: '$amount' },
      count: { $sum: 1 }
    }}
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);