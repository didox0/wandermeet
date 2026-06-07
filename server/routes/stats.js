const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ride = require('../models/Ride');
const TravelGroup = require('../models/TravelGroup');

// @route   GET api/stats
// @desc    Get overall application statistics
// @access  Public
router.get('/', async (req, res) => {
  try {
    const activeTravelers = await User.countDocuments();
    const activeRoutes = await Ride.countDocuments();
    
    res.json({
      activeTravelers,
      activeRoutes,
      countriesCovered: 1
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/stats/markers
// @desc    Get marker locations for Discover map
// @access  Public
router.get('/markers', async (req, res) => {
  try {
    const rides = await Ride.find({ startLocation: { $exists: true, $ne: '' } }, 'routeName startLocation');
    const groups = await TravelGroup.find({ destination: { $exists: true, $ne: '' } }, 'name destination');
    
    res.json({
      rides,
      groups
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/stats/travelers
// @desc    Get sample of travelers for Discovery section
// @access  Public
router.get('/travelers', async (req, res) => {
  try {
    const travelers = await User.find({}, 'username firstName lastName avatarUrl location bio interests createdAt')
      .sort({ createdAt: -1 })
      .limit(6);
      
    const count = await User.countDocuments();
    
    res.json({ count, travelers });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
