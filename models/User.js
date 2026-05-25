const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isKycVerified: {
    type: Boolean,
    default: false
  },
  kycDetails: {
    aadharNumber: String,
    panNumber: String,
    verifiedAt: Date,
    verificationId: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  otpCode: {
    code: String,
    expiresAt: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ mobileNumber: 1, isVerified: 1 });

module.exports = mongoose.model('User', userSchema);