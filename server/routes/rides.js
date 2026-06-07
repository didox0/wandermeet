const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const authMiddleware = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// ─── CREATE RIDE POST ────────────────────────────────────────────────────────
// @route   POST /api/rides/create
// @desc    Create a new ride
// @access  Private
router.post('/create', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { routeName, distance, difficulty, privacy, description, startLocation, endLocation, startDate, estimatedDuration, bikeType, maxParticipants } = req.body;
    const imageUrl = req.file ? req.file.path : null;

    if (!routeName || !distance || !startLocation || !startDate) {
      return res.status(400).json({ msg: 'Route name, distance, start location, and date are required' });
    }

    const newRide = new Ride({
      author: req.user.id,
      routeName,
      distance: parseFloat(distance),
      difficulty: difficulty || 'Medium',
      privacy: privacy || 'public',
      imageUrl: imageUrl || '',
      description: description || '',
      startLocation,
      endLocation: endLocation || startLocation,
      startDate: new Date(startDate),
      estimatedDuration: estimatedDuration || 3,
      bikeType: bikeType || '',
      maxParticipants: maxParticipants || 20,
      riderCount: 1,
      riders: [req.user.id]
    });

    const ride = await newRide.save();
    
    // Populate author details
    await ride.populate('author', 'username firstName lastName avatarUrl');
    await ride.populate('riders', 'username firstName lastName avatarUrl');
    await ride.populate('joinRequests', 'username firstName lastName avatarUrl');
    
    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── GET ALL RIDES ──────────────────────────────────────────────────────────
// @route   GET /api/rides/all
// @desc    Get all upcoming rides
// @access  Private
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {
      isCompleted: false
    };

    const rides = await Ride.find(query)
      .populate('author', 'username firstName lastName avatarUrl')
      .populate('riders', 'username firstName lastName avatarUrl')
      .populate('joinRequests', 'username firstName lastName avatarUrl')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);

    const totalRides = await Ride.countDocuments(query);

    res.json({
      rides,
      totalRides,
      totalPages: Math.ceil(totalRides / limit),
      currentPage: page
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── GET RIDE BY ID ─────────────────────────────────────────────────────────
// @route   GET /api/rides/:rideId
// @desc    Get details of a specific ride
// @access  Private
router.get('/:rideId', authMiddleware, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('author', 'username firstName lastName avatarUrl')
      .populate('riders', 'username firstName lastName avatarUrl')
      .populate('joinRequests', 'username firstName lastName avatarUrl');

    if (!ride) {
      return res.status(404).json({ msg: 'Ride not found' });
    }

    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── JOIN RIDE ──────────────────────────────────────────────────────────────
// @route   POST /api/rides/:rideId/join
// @desc    Join a ride
// @access  Private
router.post('/:rideId/join', authMiddleware, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ msg: 'Ride not found' });
    }

    // Check if already joined
    if (ride.riders.includes(req.user.id)) {
      return res.status(400).json({ msg: 'You already joined this ride' });
    }

    // Check max participants
    if (ride.riders.length >= ride.maxParticipants) {
      return res.status(400).json({ msg: 'Ride is full' });
    }

    if (ride.privacy === 'private') {
      if (ride.joinRequests.includes(req.user.id)) {
        return res.status(400).json({ msg: 'Join request already sent' });
      }
      ride.joinRequests.push(req.user.id);
    } else {
      ride.riders.push(req.user.id);
      ride.riderCount = ride.riders.length;
    }

    await ride.save();

    await ride.populate('author', 'username firstName lastName avatarUrl');
    await ride.populate('riders', 'username firstName lastName avatarUrl');
    await ride.populate('joinRequests', 'username firstName lastName avatarUrl');

    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── LEAVE RIDE ─────────────────────────────────────────────────────────────
// @route   POST /api/rides/:rideId/leave
// @desc    Leave a ride
// @access  Private
router.post('/:rideId/leave', authMiddleware, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ msg: 'Ride not found' });
    }

    const isRider = ride.riders.includes(req.user.id);
    const isRequested = ride.joinRequests.includes(req.user.id);

    if (!isRider && !isRequested) {
      return res.status(400).json({ msg: 'You are not part of this ride or have no pending requests' });
    }

    if (isRider) {
      ride.riders = ride.riders.filter(rider => rider.toString() !== req.user.id);
      ride.riderCount = ride.riders.length;
    }
    if (isRequested) {
      ride.joinRequests = ride.joinRequests.filter(u => u.toString() !== req.user.id);
    }

    await ride.save();

    await ride.populate('author', 'username firstName lastName avatarUrl');
    await ride.populate('riders', 'username firstName lastName avatarUrl');
    await ride.populate('joinRequests', 'username firstName lastName avatarUrl');

    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── GET USER'S RIDES ────────────────────────────────────────────────────────
// @route   GET /api/rides/user/:userId
// @desc    Get all rides created by a user
// @access  Private
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const rides = await Ride.find({ author: req.params.userId })
      .populate('author', 'username firstName lastName avatarUrl')
      .populate('riders', 'username firstName lastName avatarUrl')
      .populate('joinRequests', 'username firstName lastName avatarUrl')
      .sort({ startDate: -1 });

    res.json(rides);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── DELETE RIDE ─────────────────────────────────────────────────────────────
// @route   DELETE /api/rides/:rideId
// @desc    Delete a ride (only by author)
// @access  Private
router.delete('/:rideId', authMiddleware, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ msg: 'Ride not found' });
    }

    // Check if user owns the ride
    if (ride.author.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to delete this ride' });
    }

    await Ride.findByIdAndDelete(req.params.rideId);

    res.json({ msg: 'Ride deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── EDIT RIDE ───────────────────────────────────────────────────────────────
// @route   PUT /api/rides/:rideId
// @desc    Edit an existing ride
// @access  Private
router.put('/:rideId', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { routeName, distance, difficulty, privacy, description, startLocation, endLocation, startDate, estimatedDuration, bikeType, maxParticipants } = req.body;
    
    let ride = await Ride.findById(req.params.rideId);
    if (!ride) {
      return res.status(404).json({ msg: 'Ride not found' });
    }

    // Check if user owns the ride
    if (ride.author.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to edit this ride' });
    }

    const updateFields = {};
    if (routeName) updateFields.routeName = routeName;
    if (distance) updateFields.distance = parseFloat(distance);
    if (difficulty) updateFields.difficulty = difficulty;
    if (privacy) updateFields.privacy = privacy;
    if (description) updateFields.description = description;
    if (startLocation) updateFields.startLocation = startLocation;
    if (endLocation) updateFields.endLocation = endLocation;
    if (startDate) updateFields.startDate = new Date(startDate);
    if (estimatedDuration) updateFields.estimatedDuration = estimatedDuration;
    if (bikeType) updateFields.bikeType = bikeType;
    if (maxParticipants) updateFields.maxParticipants = maxParticipants;

    // If a new image was uploaded, update the imageUrl
    if (req.file) {
      updateFields.imageUrl = req.file.path;
    }

    ride = await Ride.findByIdAndUpdate(
      req.params.rideId,
      { $set: updateFields },
      { returnDocument: 'after' }
    )
    .populate('author', 'username firstName lastName avatarUrl')
    .populate('riders', 'username firstName lastName avatarUrl')
    .populate('joinRequests', 'username firstName lastName avatarUrl');

    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── UPLOAD IMAGE ──────────────────────────────────────────────────────────────
// @route   PATCH /api/rides/:rideId/image
// @desc    Upload cover image for a ride
// @access  Private
router.patch('/:rideId/image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ msg: 'Ride not found' });
    if (ride.author.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    
    if (req.file) {
      ride.imageUrl = req.file.path;
      await ride.save();
    }
    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── ACCEPT RIDE REQUEST ───────────────────────────────────────────────────
// @route   POST /api/rides/:rideId/requests/:userId/accept
// @desc    Accept a user's join request
// @access  Private
router.post('/:rideId/requests/:userId/accept', authMiddleware, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ msg: 'Ride not found' });
    
    if (ride.author.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    if (!ride.joinRequests.includes(req.params.userId)) {
      return res.status(400).json({ msg: 'No pending request found' });
    }

    if (ride.riders.length >= ride.maxParticipants) {
      return res.status(400).json({ msg: 'Ride is full' });
    }

    // Remove from requests, add to riders
    ride.joinRequests = ride.joinRequests.filter(u => u.toString() !== req.params.userId);
    ride.riders.push(req.params.userId);
    ride.riderCount = ride.riders.length;

    await ride.save();
    await ride.populate('author', 'username firstName lastName avatarUrl');
    await ride.populate('riders', 'username firstName lastName avatarUrl');
    await ride.populate('joinRequests', 'username firstName lastName avatarUrl');

    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── REJECT RIDE REQUEST ───────────────────────────────────────────────────
// @route   POST /api/rides/:rideId/requests/:userId/reject
// @desc    Reject a user's join request
// @access  Private
router.post('/:rideId/requests/:userId/reject', authMiddleware, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ msg: 'Ride not found' });
    
    if (ride.author.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    ride.joinRequests = ride.joinRequests.filter(u => u.toString() !== req.params.userId);
    await ride.save();

    await ride.populate('author', 'username firstName lastName avatarUrl');
    await ride.populate('riders', 'username firstName lastName avatarUrl');
    await ride.populate('joinRequests', 'username firstName lastName avatarUrl');

    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
