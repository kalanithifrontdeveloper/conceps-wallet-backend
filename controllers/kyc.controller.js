const User = require('../models/User');
const axios = require('axios');

// Mock UDAI API integration
// Replace with actual UDAI API endpoint
const UDAI_API_URL = process.env.UDAI_API_URL || 'https://api.udai.gov.in/v1/verify';
const UDAI_API_KEY = process.env.UDAI_API_KEY;

// Verify Aadhar using UDAI API
exports.verifyAadhar = async (req, res) => {
  try {
    const { aadharNumber, name, dob } = req.body;
    const userId = req.user.userId;
    
    if (!aadharNumber || !/^\d{12}$/.test(aadharNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 12-digit Aadhar number is required'
      });
    }
    
    // Call UDAI API for verification
    // This is a mock implementation
    const verificationResult = await mockUDAIVerification(aadharNumber, name, dob);
    
    if (verificationResult.success) {
      // Update user KYC status
      await User.findByIdAndUpdate(userId, {
        isKycVerified: true,
        kycDetails: {
          aadharNumber: maskAadhar(aadharNumber),
          verifiedAt: new Date(),
          verificationId: verificationResult.verificationId
        }
      });
      
      res.json({
        success: true,
        message: 'KYC verification successful',
        data: {
          isVerified: true,
          verificationId: verificationResult.verificationId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: verificationResult.message || 'KYC verification failed'
      });
    }
  } catch (error) {
    console.error('KYC verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify KYC'
    });
  }
};

// Mock UDAI API (replace with actual API call)
async function mockUDAIVerification(aadharNumber, name, dob) {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock validation - in production, this would be actual API call
  if (aadharNumber && aadharNumber.length === 12) {
    return {
      success: true,
      verificationId: `VER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: 'Verification successful'
    };
  }
  
  return {
    success: false,
    message: 'Invalid Aadhar details'
  };
}

// Get KYC status
exports.getKycStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('isKycVerified kycDetails');
    
    res.json({
      success: true,
      data: {
        isKycVerified: user.isKycVerified,
        kycDetails: user.kycDetails
      }
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYC status'
    });
  }
};

// Mask Aadhar number for security
function maskAadhar(aadharNumber) {
  return 'XXXX-XXXX-' + aadharNumber.slice(-4);
}