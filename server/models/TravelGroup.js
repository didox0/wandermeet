const mongoose = require('mongoose');

// ─── Poll Option Sub-Schema ───────────────────────────────────────────────────
const PollOptionSchema = new mongoose.Schema({
  text:  { type: String, required: true, trim: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // user IDs who voted
}, { _id: true });

// ─── Poll Sub-Schema ──────────────────────────────────────────────────────────
const PollSchema = new mongoose.Schema({
  question:  { type: String, required: true, trim: true },
  options:   [PollOptionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

// ─── Expense Sub-Schema ───────────────────────────────────────────────────────
const ExpenseSchema = new mongoose.Schema({
  description:  { type: String, required: true, trim: true },
  totalAmount:  { type: Number, required: true, min: 0 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // split between
  paidBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:    { type: Date, default: Date.now }
}, { _id: true });

// ─── Message Sub-Schema ───────────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, trim: true },
  isSystem:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

// ─── TravelGroup Main Schema ──────────────────────────────────────────────────
const TravelGroupSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  description: { type: String, trim: true, maxlength: 300 },
  imageUrl:    { type: String, default: '' }, // Cloudinary cover image

  // Access control
  privacy:    { type: String, enum: ['public', 'private'], default: 'public' },
  maxMembers: { type: Number, default: 20, min: 2, max: 50 },

  // Membership
  host:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Chat
  messages: [MessageSchema],

  // Trip Canvas
  polls:    [PollSchema],
  expenses: [ExpenseSchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-update updatedAt on every save
TravelGroupSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.models.TravelGroup || mongoose.model('TravelGroup', TravelGroupSchema);
