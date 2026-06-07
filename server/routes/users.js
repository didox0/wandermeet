const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// ─── SEARCH USERS ────────────────────────────────────────────────────────────
// @route   GET /api/users/search
// @desc    Search users by username or first/last name
// @access  Private
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    // Create a case-insensitive regex for search
    const searchRegex = new RegExp(q, 'i');

    const currentUser = await User.findById(req.user.id).select('friends following');

    const users = await User.find({
      $or: [
        { username: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex }
      ],
      // Exclude the current user from search results
      _id: { $ne: req.user.id }
    })
      .select("username firstName lastName avatarUrl isPrivate friendRequests friends")
      .limit(10);

    const mappedUsers = users.map(user => {
      const u = user.toObject();
      const isFriend = currentUser.friends.includes(u._id) || u.friends.includes(currentUser._id);
      const isRequested = u.friendRequests.includes(currentUser._id);
      const isFollowing = currentUser.following.includes(u._id);

      delete u.friendRequests;
      delete u.friends;

      return {
        ...u,
        isFriend,
        isRequested,
        isFollowing
      };
    });

    res.json(mappedUsers);
  } catch (err) {
    console.error("Search users error:", err.message);
    res.status(500).send("Server Error");
  }
});

// ─── FOLLOW / SEND FRIEND REQUEST ────────────────────────────────────────────
// @route   POST /api/users/follow/:id
// @desc    Follow a user (instant) + send a friend request they can accept
// @access  Private
router.post("/follow/:id", authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ msg: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if already friends or requested
    if (currentUser.friends.includes(targetUserId)) {
      return res.status(400).json({ msg: "You are already friends with this user" });
    }
    if (targetUser.friendRequests.includes(currentUserId)) {
      return res.status(400).json({ msg: "You have already sent a friend request" });
    }

    // Add to followers/following lists
    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
    }
    if (!targetUser.followers.includes(currentUserId)) {
      targetUser.followers.push(currentUserId);
    }

    let status = {};

    // If target user is public, they become friends instantly
    if (!targetUser.isPrivate) {
      currentUser.friends.push(targetUserId);
      targetUser.friends.push(currentUserId);
      
      // Also make the target user follow back
      if (!targetUser.following.includes(currentUserId)) {
        targetUser.following.push(currentUserId);
      }
      if (!currentUser.followers.includes(targetUserId)) {
        currentUser.followers.push(targetUserId);
      }
      status = { isFriend: true };
    } else {
      // If private, send a friend request
      targetUser.friendRequests.push(currentUserId);
      status = { isRequested: true };
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ msg: targetUser.isPrivate ? "Friend request sent" : "You are now friends", ...status });
  } catch (err) {
    console.error("Follow error:", err.message);
    res.status(500).send("Server Error");
  }
});

// ─── UNFOLLOW A USER ─────────────────────────────────────────────────────────
// @route   POST /api/users/unfollow/:id
// @desc    Unfollow a user
// @access  Private
router.post("/unfollow/:id", authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Remove from current user's following list
    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== targetUserId
    );
    // Also remove from friends list
    currentUser.friends = currentUser.friends.filter(
      (id) => id.toString() !== targetUserId
    );
    await currentUser.save();

    // Remove from target user's followers list
    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== currentUserId
    );
    // Also remove from friends list
    targetUser.friends = targetUser.friends.filter(
      (id) => id.toString() !== currentUserId
    );
    await targetUser.save();

    res.json({ msg: "Successfully unfollowed user", following: currentUser.following });
  } catch (err) {
    console.error("Unfollow error:", err.message);
    res.status(500).send("Server Error");
  }
});

// ─── GET PUBLIC PROFILE ──────────────────────────────────────────────────────
// @route   GET /api/users/profile/:username
// @desc    Get user profile details (respecting privacy)
// @access  Private
router.get("/profile/:username", authMiddleware, async (req, res) => {
  try {
    const username = req.params.username;
    const currentUserId = req.user.id;

    const userProfile = await User.findOne({ username }).select("-password -resetPasswordToken -resetPasswordExpires");

    if (!userProfile) {
      return res.status(404).json({ msg: "User not found" });
    }

    const currentUser = await User.findById(currentUserId).select("friends following");

    // Check relationship symmetrically (safely handle ObjectId to string comparisons)
    const isFollowing = 
      userProfile.followers.some(id => id.toString() === currentUserId) || 
      currentUser.following.some(id => id.toString() === userProfile._id.toString());
      
    const isFriend = 
      userProfile.friends.some(id => id.toString() === currentUserId) || 
      currentUser.friends.some(id => id.toString() === userProfile._id.toString());
      
    const isRequested = userProfile.friendRequests.some(id => id.toString() === currentUserId);
    const isSelf = userProfile._id.toString() === currentUserId;

    // Apply privacy logic
    if (userProfile.isPrivate && !isFollowing && !isSelf) {
      // Return limited profile
      return res.json({
        id: userProfile._id,
        username: userProfile.username,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        avatarUrl: userProfile.avatarUrl,
        bannerUrl: userProfile.bannerUrl,
        isPrivate: true,
        isFollowing: false,
        isFriend: false,
        isRequested,
        followersCount: userProfile.followers.length,
        followingCount: userProfile.following.length,
        msg: "This profile is private. Follow to see more details."
      });
    }

    // Return full profile
    res.json({
      id: userProfile._id,
      username: userProfile.username,
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      email: userProfile.email,
      phone: userProfile.phone,
      location: userProfile.location,
      interests: userProfile.interests,
      bio: userProfile.bio,
      avatarUrl: userProfile.avatarUrl,
      bannerUrl: userProfile.bannerUrl,
      travelLogs: userProfile.travelLogs || [],
      isPrivate: userProfile.isPrivate,
      isFollowing,
      isFriend,
      isRequested,
      followersCount: userProfile.followers.length,
      followingCount: userProfile.following.length,
    });

  } catch (err) {
    console.error("Get public profile error:", err.message);
    res.status(500).send("Server Error");
  }
});

// ─── GET FRIEND REQUESTS ─────────────────────────────────────────────────────
// @route   GET /api/users/friend-requests
// @desc    Get incoming friend requests for the logged-in user
// @access  Private
router.get("/friend-requests", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friendRequests", "username firstName lastName avatarUrl");
    res.json(user.friendRequests || []);
  } catch (err) {
    console.error("Get friend requests error:", err.message);
    res.status(500).send("Server Error");
  }
});

// ─── ACCEPT FRIEND REQUEST ───────────────────────────────────────────────────
// @route   POST /api/users/friend-request/accept/:id
// @desc    Accept a friend request
// @access  Private
router.post("/friend-request/accept/:id", authMiddleware, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    const requester = await User.findById(requesterId);

    if (!requester) return res.status(404).json({ msg: "User not found" });

    // Remove from friendRequests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      (id) => id.toString() !== requesterId
    );

    // Add to friends for both users (if not already friends)
    if (!currentUser.friends.includes(requesterId)) {
      currentUser.friends.push(requesterId);
    }
    if (!requester.friends.includes(currentUserId)) {
      requester.friends.push(currentUserId);
    }

    // Also add mutual follow
    if (!currentUser.followers.includes(requesterId)) {
      currentUser.followers.push(requesterId);
    }
    if (!currentUser.following.includes(requesterId)) {
      currentUser.following.push(requesterId);
    }
    if (!requester.followers.includes(currentUserId)) {
      requester.followers.push(currentUserId);
    }
    if (!requester.following.includes(currentUserId)) {
      requester.following.push(currentUserId);
    }

    await currentUser.save();
    await requester.save();

    res.json({ msg: "Friend request accepted" });
  } catch (err) {
    console.error("Accept friend request error:", err.message);
    res.status(500).send("Server Error");
  }
});

// ─── REJECT FRIEND REQUEST ──────────────────────────────────────────────────
// @route   POST /api/users/friend-request/reject/:id
// @desc    Reject a friend request
// @access  Private
router.post("/friend-request/reject/:id", authMiddleware, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUser = await User.findById(req.user.id);

    currentUser.friendRequests = currentUser.friendRequests.filter(
      (id) => id.toString() !== requesterId
    );
    await currentUser.save();

    res.json({ msg: "Friend request rejected" });
  } catch (err) {
    console.error("Reject friend request error:", err.message);
    res.status(500).send("Server Error");
  }
});

// ─── GET FRIENDS LIST ────────────────────────────────────────────────────────
// @route   GET /api/users/friends
// @desc    Get the current user's friends list
// @access  Private
router.get("/friends", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friends", "username firstName lastName avatarUrl");
    res.json(user.friends || []);
  } catch (err) {
    console.error("Get friends error:", err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
