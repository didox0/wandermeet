const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, trim: true },
  imageUrl: { type: String, trim: true }, // Optional image for the post
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who saved this post
  createdAt: { type: Date, default: Date.now }
});

// A post must have at least content or an image
PostSchema.pre('validate', function() {
  if (!this.content && !this.imageUrl) {
    throw new Error('A post must have either text content or an image.');
  }
});

module.exports = mongoose.models.Post || mongoose.model("Post", PostSchema);
