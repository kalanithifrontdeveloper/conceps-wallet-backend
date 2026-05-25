const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (userId, mobileNumber) => {
  return jwt.sign(
    { userId, mobileNumber },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '30d' }
  );
};

// Generate OTP (6-digit for demo)
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP (mock function - integrate with actual SMS service)
const sendOtpViaSms = async (mobileNumber, otpCode) => {
  console.log(`Sending OTP ${otpCode} to ${mobileNumber}`);
  // Integrate with Twilio, Fast2SMS, or any SMS provider
  return true;
};

// Register/Login with OTP
exports.sendOtp = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    
    if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit mobile number is required'
      });
    }
    
    const otpCode = generateOtp();
    
    // Save OTP to database
    await Otp.create({
      mobileNumber,
      otpCode,
      purpose: 'login',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    
    // Send OTP via SMS
    await sendOtpViaSms(mobileNumber, otpCode);
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      // In production, don't send OTP in response
      debug: process.env.NODE_ENV === 'development' ? { otp: otpCode } : undefined
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

// Verify OTP and login/register
exports.verifyOtp = async (req, res) => {
  try {
    const { mobileNumber, otpCode, name } = req.body;
    
    // Find valid OTP
    const otpRecord = await Otp.findOne({
      mobileNumber,
      otpCode,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
    
    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    // Find or create user
    let user = await User.findOne({ mobileNumber });
    let isNewUser = false;
    
    if (!user) {
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for new user registration'
        });
      }
      
      user = await User.create({
        mobileNumber,
        name,
        isVerified: true,
        lastLogin: new Date()
      });
      
      // Create wallet for new user
      await Wallet.create({
        userId: user._id,
        balance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0
      });
      
      isNewUser = true;
    } else {
      user.lastLogin = new Date();
      await user.save();
    }
    
    // Generate JWT token
    const token = generateToken(user._id, user.mobileNumber);
    
    // Get wallet details
    const wallet = await Wallet.findOne({ userId: user._id });
    
    res.json({
      success: true,
      message: isNewUser ? 'Registration successful' : 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          mobileNumber: user.mobileNumber,
          isKycVerified: user.isKycVerified,
          email: user.email
        },
        wallet: {
          balance: wallet?.balance || 0,
          totalDeposited: wallet?.totalDeposited || 0,
          totalWithdrawn: wallet?.totalWithdrawn || 0
        },
        isNewUser
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-otpCode');
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        user,
        wallet
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};