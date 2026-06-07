const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  routeName: { type: String, required: true, trim: true },
  distance: { type: Number, required: true }, // in km
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', 'Expert'], default: 'Medium' },
  privacy: { type: String, enum: ['public', 'private'], default: 'public' },
  imageUrl: { type: String, trim: true },
  description: { type: String, trim: true },
  startLocation: { type: String, required: true, trim: true },
  endLocation: { type: String, trim: true },
  startDate: { type: Date, required: true },
  estimatedDuration: { type: Number }, // in hours
  riderCount: { type: Number, default: 0 },
  riders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // People joining this ride
  joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // People requesting to join (for private rides)
  bikeType: { type: String, trim: true }, // e.g., "Royal Enfield", "Harley Davidson"
  maxParticipants: { type: Number, default: 20 },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Ride || mongoose.model("Ride", RideSchema);
