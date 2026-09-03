import User from '../models/User.js';
import Farmer from '../models/Farmer.js';
import Operator from '../models/Operator.js';
import Centre from '../models/Centre.js';
import jwt from 'jsonwebtoken';

// Helper to sign JWT
const signToken = (id) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Farmer Registration
export const register = async (req, res) => {
  try {
    const { username, password, name, mobileNumber, farmerId, village, district, state, preferredLanguage } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Mobile number is already registered' });
    }

    // Check if farmer ID exists
    const existingFarmer = await Farmer.findOne({ farmerId });
    if (existingFarmer) {
      return res.status(400).json({ success: false, message: 'Farmer ID is already registered' });
    }

    // Create User
    const user = await User.create({
      username,
      password,
      role: 'farmer'
    });

    // Create Farmer Profile
    const farmer = await Farmer.create({
      userId: user._id,
      name,
      mobileNumber,
      farmerId,
      village,
      district,
      state,
      preferredLanguage: preferredLanguage || 'en'
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        farmerProfile: farmer
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Procurement Centre Registration (Public Request Flow)
export const registerCentre = async (req, res) => {
  try {
    const {
      name,
      centreCode,
      district,
      state,
      location,
      contactPerson,
      contactNumber,
      email,
      capacity,
      activeCounters,
      operatingHours,
      cropsHandled,
      password
    } = req.body;

    if (!name || !district || !location || !contactPerson || !contactNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory centre registration fields'
      });
    }

    // Check if contact number / username is already registered
    const existingUser = await User.findOne({ username: contactNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user account with this mobile number already exists'
      });
    }

    // Check if Centre Name in this district already exists
    const existingCentre = await Centre.findOne({
      name: new RegExp(`^${name.trim()}$`, 'i'),
      district: new RegExp(`^${district.trim()}$`, 'i')
    });
    if (existingCentre) {
      return res.status(400).json({
        success: false,
        message: 'A procurement centre with this name already exists in this district'
      });
    }

    // Generate Centre Code if not provided
    const generatedCode = centreCode && centreCode.trim() 
      ? centreCode.trim().toUpperCase()
      : `MANDI-${district.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Create User Account with role 'operator'
    const user = await User.create({
      username: contactNumber,
      password,
      role: 'operator'
    });

    // Create Centre with PENDING status
    const centre = await Centre.create({
      name: name.trim(),
      centreCode: generatedCode,
      district: district.trim(),
      state: state ? state.trim() : 'Maharashtra',
      location: location.trim(),
      contactPerson: contactPerson.trim(),
      contactNumber: contactNumber.trim(),
      email: email ? email.trim() : '',
      capacity: Number(capacity) || 50,
      activeCounters: Number(activeCounters) || 2,
      operatingHours: operatingHours || '08:00 AM - 06:00 PM',
      cropsHandled: Array.isArray(cropsHandled) && cropsHandled.length > 0
        ? cropsHandled 
        : ['Wheat', 'Paddy (Rice)', 'Cotton', 'Maize', 'Soybean'],
      operatorUserId: user._id,
      status: 'PENDING'
    });

    // Create Operator Profile linked to this Centre
    const operator = await Operator.create({
      userId: user._id,
      name: contactPerson.trim(),
      centreId: centre._id,
      contact: contactNumber.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Procurement Centre registration submitted successfully! Your centre request is currently PENDING approval by the Administrator.',
      data: {
        centreId: centre._id,
        name: centre.name,
        centreCode: centre.centreCode,
        status: centre.status
      }
    });
  } catch (err) {
    console.error('Centre registration error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Unified Login with Centre Approval Verification
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide mobile/username and password' });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Get profiles depending on role
    let profile = null;
    if (user.role === 'farmer') {
      profile = await Farmer.findOne({ userId: user._id });
    } else if (user.role === 'operator') {
      profile = await Operator.findOne({ userId: user._id }).populate('centreId');
      
      // Strict Check for Centre Approval Status
      if (profile?.centreId) {
        const centreStatus = profile.centreId.status;
        if (centreStatus === 'PENDING') {
          return res.status(403).json({
            success: false,
            message: 'Your Procurement Centre account is currently PENDING Administrator approval. Please await review or contact the state authority.'
          });
        }
        if (centreStatus === 'REJECTED') {
          return res.status(403).json({
            success: false,
            message: 'Your Procurement Centre registration request was REJECTED by the Administrator.'
          });
        }
        if (centreStatus === 'inactive') {
          return res.status(403).json({
            success: false,
            message: 'This Procurement Centre is currently marked as INACTIVE.'
          });
        }
      }
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        profile
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get current logged-in user profile
export const getMe = async (req, res) => {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'farmer') {
      profile = await Farmer.findOne({ userId: user._id });
    } else if (user.role === 'operator') {
      profile = await Operator.findOne({ userId: user._id }).populate('centreId');
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        profile
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
