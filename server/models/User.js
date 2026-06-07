const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, required: true, unique: true, trim: true }, // The traveler's Gmail
  password: { type: String, required: true }, // Their new WanderMeet password (hashed)
  phone: { type: String, unique: true, sparse: true, trim: true }, // Phone number with country code
  altEmail: { type: String, trim: true }, // Alternative email for emergencies
  location: { type: String, trim: true }, // User location
  interests: { type: [String], default: [] }, // User travel interests
  bio: { type: String, trim: true }, // User bio/about me
  avatarUrl: { type: String, trim: true }, // Cloudinary profile picture URL
  bannerUrl: { type: String, trim: true }, // Cloudinary profile banner URL
  travelLogs: [{ type: String }], // Array of Cloudinary image URLs for travel memories
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // People following this user
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // People this user follows
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Pending incoming friend requests
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Accepted friends
  isPrivate: { type: Boolean, default: false }, // If true, only followers see full profile details
  createdAt: { type: Date, default: Date.now },
  resetPasswordToken:   { type: String },   // Secure token sent via email
  resetPasswordExpires: { type: Date },      // Token expiry (1 hour)
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
