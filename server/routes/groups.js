const express = require('express');
const router = express.Router();
const TravelGroup = require('../models/TravelGroup');
const authMiddleware = require('../middleware/auth');
const { uploadGroupImage } = require('../config/cloudinary');

// Helper to populate a group fully
const populateGroup = (query) =>
  query
    .populate('host', 'username firstName lastName avatarUrl')
    .populate('members', 'username firstName lastName avatarUrl')
    .populate('pendingRequests', 'username firstName lastName avatarUrl')
    .populate('messages.sender', 'username firstName lastName avatarUrl')
    .populate('polls.createdBy', 'username firstName lastName avatarUrl')
    .populate('polls.options.votes', 'username')
    .populate('expenses.createdBy', 'username firstName lastName avatarUrl')
    .populate('expenses.paidBy', 'username firstName lastName avatarUrl')
    .populate('expenses.participants', 'username firstName lastName avatarUrl');

// ─── GET ALL GROUPS ───────────────────────────────────────────────────────────
// @route   GET /api/groups
// @desc    List all travel groups (public info)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await TravelGroup.find()
      .populate('host', 'username firstName lastName avatarUrl')
      .populate('members', 'username firstName lastName avatarUrl')
      .sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── GET SINGLE GROUP ────────────────────────────────────────────────────────
// @route   GET /api/groups/:groupId
// @desc    Get full group details (including messages, polls, expenses)
// @access  Private
router.get('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await populateGroup(TravelGroup.findById(req.params.groupId));
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── CREATE GROUP ────────────────────────────────────────────────────────
// @route   POST /api/groups/create
// @desc    Create a new travel group (creator becomes host + first member)
// @access  Private
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, destination, startDate, endDate, description, privacy, maxMembers } = req.body || {};
    if (!name || !destination || !startDate || !endDate) {
      return res.status(400).json({ msg: 'name, destination, startDate, endDate are required' });
    }

    const group = new TravelGroup({
      name,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description || '',
      privacy: privacy || 'public',
      maxMembers: maxMembers || 20,
      host: req.user.id,
      members: [req.user.id],
      imageUrl: '',
    });

    await group.save();
    await group.populate([
      { path: 'host', select: 'username firstName lastName avatarUrl' },
      { path: 'members', select: 'username firstName lastName avatarUrl' }
    ]);
    res.json(group);
  } catch (err) {
    console.log("GROUP CREATE ERROR:", err.message);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

// ─── UPLOAD / UPDATE GROUP IMAGE ──────────────────────────────────────────────
// @route   PATCH /api/groups/:groupId/image
// @desc    Upload or update a group's cover image (host only)
// @access  Private
router.patch('/:groupId/image', authMiddleware, uploadGroupImage.single('image'), async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (group.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the host can update the group image' });
    }
    if (!req.file) return res.status(400).json({ msg: 'No image file provided' });

    const imageUrl = req.file.path || req.file.secure_url || req.file.url || '';
    if (!imageUrl) {
      console.error('Cloudinary did not return a valid URL:', req.file);
      return res.status(500).json({ msg: 'Image upload failed on the server' });
    }
    group.imageUrl = imageUrl;
    await group.save();
    res.json({ imageUrl: group.imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});


// ─── JOIN GROUP (Public) ─────────────────────────────────────────────────────
// @route   POST /api/groups/:groupId/join
// @desc    Join a public group immediately; request to join a private group
// @access  Private
router.post('/:groupId/join', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    const userId = req.user.id;
    const isMember = group.members.some(m => m.toString() === userId);
    const isPending = group.pendingRequests.some(r => r.toString() === userId);

    if (isMember) return res.status(400).json({ msg: 'Already a member' });
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ msg: 'Group is full' });
    }

    if (group.privacy === 'public') {
      group.members.push(userId);
      group.messages.push({ sender: userId, text: 'joined the group', isSystem: true });
    } else {
      // private — add to pending requests
      if (isPending) return res.status(400).json({ msg: 'Request already pending' });
      group.pendingRequests.push(userId);
    }

    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── APPROVE / REJECT JOIN REQUEST (Host only) ───────────────────────────────
// @route   POST /api/groups/:groupId/request/:userId/approve
// @route   POST /api/groups/:groupId/request/:userId/reject
// @access  Private (host only)
router.post('/:groupId/request/:userId/approve', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (group.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the host can approve requests' });
    }
    const targetId = req.params.userId;
    group.pendingRequests = group.pendingRequests.filter(r => r.toString() !== targetId);
    if (group.members.length < group.maxMembers) {
      group.members.push(targetId);
      group.messages.push({ sender: targetId, text: 'joined the group', isSystem: true });
    } else {
      return res.status(400).json({ msg: 'Group is full, cannot approve' });
    }
    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/:groupId/request/:userId/reject', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (group.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the host can reject requests' });
    }
    group.pendingRequests = group.pendingRequests.filter(r => r.toString() !== req.params.userId);
    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── LEAVE GROUP ─────────────────────────────────────────────────────────────
// @route   POST /api/groups/:groupId/leave
// @access  Private
router.post('/:groupId/leave', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (group.host.toString() === req.user.id) {
      return res.status(400).json({ msg: 'Host cannot leave. Delete the group instead.' });
    }
    group.members = group.members.filter(m => m.toString() !== req.user.id);
    group.messages.push({ sender: req.user.id, text: 'left the group', isSystem: true });
    await group.save();
    res.json({ msg: 'Left the group' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── SEND MESSAGE ────────────────────────────────────────────────────────────
// @route   POST /api/groups/:groupId/messages
// @access  Private (members only)
router.post('/:groupId/messages', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ msg: 'Message text required' });

    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ msg: 'Only members can send messages' });

    group.messages.push({ sender: req.user.id, text: text.trim() });
    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── CREATE POLL ─────────────────────────────────────────────────────────────
// @route   POST /api/groups/:groupId/polls
// @access  Private (members only)
router.post('/:groupId/polls', authMiddleware, async (req, res) => {
  try {
    const { question, options } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ msg: 'question and at least 2 options required' });
    }

    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ msg: 'Only members can create polls' });

    group.polls.push({
      question,
      options: options.map(o => ({ text: o, votes: [] })),
      createdBy: req.user.id,
    });
    group.messages.push({
      sender: req.user.id,
      text: `created a new poll: "${question}"`,
      isSystem: true
    });
    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── VOTE ON POLL ────────────────────────────────────────────────────────────
// @route   POST /api/groups/:groupId/polls/:pollId/vote
// @access  Private (members only)
router.post('/:groupId/polls/:pollId/vote', authMiddleware, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    if (optionIndex === undefined) return res.status(400).json({ msg: 'optionIndex required' });

    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ msg: 'Only members can vote' });

    const poll = group.polls.id(req.params.pollId);
    if (!poll) return res.status(404).json({ msg: 'Poll not found' });

    // Remove previous vote from all options (one vote per user)
    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== req.user.id);
    });
    // Add vote to selected option
    if (optionIndex >= 0 && optionIndex < poll.options.length) {
      poll.options[optionIndex].votes.push(req.user.id);
    }

    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── DELETE POLL ─────────────────────────────────────────────────────────────
// @route   DELETE /api/groups/:groupId/polls/:pollId
// @access  Private (creator or host)
router.delete('/:groupId/polls/:pollId', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    const poll = group.polls.id(req.params.pollId);
    if (!poll) return res.status(404).json({ msg: 'Poll not found' });

    if (poll.createdBy.toString() !== req.user.id && group.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this poll' });
    }

    group.polls.pull(req.params.pollId);
    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── ADD EXPENSE ─────────────────────────────────────────────────────────────
// @route   POST /api/groups/:groupId/expenses
// @access  Private (members only)
router.post('/:groupId/expenses', authMiddleware, async (req, res) => {
  try {
    const { description, totalAmount, participants, paidBy } = req.body;
    if (!description || totalAmount === undefined || !Array.isArray(participants) || !participants.length) {
      return res.status(400).json({ msg: 'description, totalAmount, and participants required' });
    }
    if (!isNaN(description.trim())) {
      return res.status(400).json({ msg: 'Expense description cannot be purely a number' });
    }
    const parsedAmount = parseFloat(totalAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ msg: 'Total amount must be a valid positive number' });
    }

    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ msg: 'Only members can add expenses' });

    group.expenses.push({
      description,
      totalAmount: parseFloat(totalAmount),
      participants,
      paidBy: paidBy || req.user.id,
      createdBy: req.user.id,
    });
    group.messages.push({
      sender: req.user.id,
      text: `added a new expense: "${description}" for ₹${totalAmount}`,
      isSystem: true
    });
    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── DELETE EXPENSE ──────────────────────────────────────────────────────────
// @route   DELETE /api/groups/:groupId/expenses/:expenseId
// @access  Private (creator or host)
router.delete('/:groupId/expenses/:expenseId', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    const expense = group.expenses.id(req.params.expenseId);
    if (!expense) return res.status(404).json({ msg: 'Expense not found' });

    if (expense.createdBy.toString() !== req.user.id && group.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this expense' });
    }

    group.expenses.pull(req.params.expenseId);
    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── EDIT GROUP (Host only) ───────────────────────────────────────────────────
// @route   PUT /api/groups/:groupId
// @desc    Edit group name, destination, dates, description, privacy, maxMembers
// @access  Private (host only)
router.put('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (group.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the host can edit this group' });
    }
    const { name, destination, startDate, endDate, description, privacy, maxMembers } = req.body;
    if (name) group.name = name;
    if (destination) group.destination = destination;
    if (startDate) group.startDate = new Date(startDate);
    if (endDate) group.endDate = new Date(endDate);
    if (description !== undefined) group.description = description;
    if (privacy) group.privacy = privacy;
    if (maxMembers) group.maxMembers = parseInt(maxMembers);
    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── KICK MEMBER (Host only) ──────────────────────────────────────────────────
// @route   DELETE /api/groups/:groupId/members/:userId
// @desc    Remove a member from the group (host only, cannot kick self)
// @access  Private (host only)
router.delete('/:groupId/members/:userId', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (group.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the host can remove members' });
    }
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ msg: 'Host cannot remove themselves' });
    }
    group.members = group.members.filter(m => m.toString() !== req.params.userId);
    group.messages.push({ sender: req.params.userId, text: 'was removed from the group', isSystem: true });
    await group.save();
    const populated = await populateGroup(TravelGroup.findById(group._id));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── UPDATE GROUP (Host only) ────────────────────────────────────────────────
// @route   PUT /api/groups/:groupId
// @desc    Update group details
// @access  Private (host only)
router.put('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (group.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the host can update this group' });
    }

    const { name, destination, startDate, endDate, description, privacy, maxMembers } = req.body;
    if (name) group.name = name;
    if (destination) group.destination = destination;
    if (startDate) group.startDate = new Date(startDate);
    if (endDate) group.endDate = new Date(endDate);
    if (description !== undefined) group.description = description;
    if (privacy) group.privacy = privacy;
    if (maxMembers) group.maxMembers = maxMembers;

    await group.save();
    res.json({ msg: 'Group updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── DELETE GROUP (Host only) ────────────────────────────────────────────────
// @route   DELETE /api/groups/:groupId
// @access  Private (host only)
router.delete('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await TravelGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (group.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the host can delete this group' });
    }
    await TravelGroup.findByIdAndDelete(req.params.groupId);
    res.json({ msg: 'Group deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;

