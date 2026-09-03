import Farmer from '../models/Farmer.js';

// Get farmer profile by ID
export const getFarmerProfile = async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ userId: req.params.id });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }
    res.status(200).json({ success: true, data: farmer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update farmer profile (e.g. language or details)
export const updateFarmerProfile = async (req, res) => {
  try {
    const { name, village, district, state, preferredLanguage } = req.body;
    let farmer = await Farmer.findOne({ userId: req.user._id });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }

    farmer.name = name || farmer.name;
    farmer.village = village || farmer.village;
    farmer.district = district || farmer.district;
    farmer.state = state || farmer.state;
    farmer.preferredLanguage = preferredLanguage || farmer.preferredLanguage;

    await farmer.save();
    res.status(200).json({ success: true, data: farmer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
