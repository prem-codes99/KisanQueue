import Centre from '../models/Centre.js';
import Operator from '../models/Operator.js';

// Get all active/approved procurement centres (for booking and public lists)
export const getAllCentres = async (req, res) => {
  try {
    const { district } = req.query;
    let query = { status: { $in: ['active', 'APPROVED'] } };
    
    if (district) {
      query.district = new RegExp(district, 'i');
    }

    const centres = await Centre.find(query);
    res.status(200).json({ success: true, count: centres.length, data: centres });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single centre
export const getCentreById = async (req, res) => {
  try {
    const centre = await Centre.findById(req.params.id);
    if (!centre) {
      return res.status(404).json({ success: false, message: 'Centre not found' });
    }
    res.status(200).json({ success: true, data: centre });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all Centre Registration Requests (Admin only)
export const getCentreRequests = async (req, res) => {
  try {
    const requests = await Centre.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve Centre Registration (Admin only)
export const approveCentre = async (req, res) => {
  try {
    const centre = await Centre.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED' },
      { new: true }
    );
    if (!centre) {
      return res.status(404).json({ success: false, message: 'Centre not found' });
    }
    res.status(200).json({
      success: true,
      message: `Procurement Centre "${centre.name}" has been APPROVED successfully.`,
      data: centre
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject Centre Registration (Admin only)
export const rejectCentre = async (req, res) => {
  try {
    const centre = await Centre.findByIdAndUpdate(
      req.params.id,
      { status: 'REJECTED' },
      { new: true }
    );
    if (!centre) {
      return res.status(404).json({ success: false, message: 'Centre not found' });
    }
    res.status(200).json({
      success: true,
      message: `Procurement Centre "${centre.name}" registration has been REJECTED.`,
      data: centre
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create a new centre (Admin direct creation)
export const createCentre = async (req, res) => {
  try {
    const { name, centreCode, location, district, state, capacity, activeCounters, contactNumber, contactPerson, operatingHours } = req.body;
    const newCentre = await Centre.create({
      name,
      centreCode: centreCode || `MANDI-${(district || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      location,
      district,
      state: state || 'Maharashtra',
      capacity: Number(capacity) || 50,
      activeCounters: Number(activeCounters) || 2,
      contactNumber,
      contactPerson: contactPerson || name,
      operatingHours: operatingHours || '08:00 AM - 06:00 PM',
      status: 'APPROVED'
    });
    res.status(201).json({ success: true, data: newCentre });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update centre details (Admin only)
export const updateCentre = async (req, res) => {
  try {
    const centre = await Centre.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!centre) {
      return res.status(404).json({ success: false, message: 'Centre not found' });
    }
    res.status(200).json({ success: true, data: centre });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
