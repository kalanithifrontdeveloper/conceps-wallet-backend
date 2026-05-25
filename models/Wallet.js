const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDeposited: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to update balance with validation
walletSchema.methods.updateBalance = async function(amount, type) {
  if (type === 'deposit') {
    this.balance += amount;
    this.totalDeposited += amount;
  } else if (type === 'withdraw') {
    if (this.balance < amount) {
      throw new Error('Insufficient balance');
    }
    this.balance -= amount;
    this.totalWithdrawn += amount;
  }
  this.updatedAt = Date.now();
  await this.save();
  return this;
};

module.exports = mongoose.model('Wallet', walletSchema);