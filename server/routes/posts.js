const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { uploadPostImage } = require('../config/cloudinary');

// ─── CREATE POST ────────────────────────────────────────────────────────────
// @route   POST /api/posts/create
// @desc    Create a new post
// @access  Private
router.post('/create', authMiddleware, uploadPostImage.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    let imageUrl = '';
    if (req.file) {
      imageUrl = req.file.path || req.file.secure_url || req.file.url || '';
    }

    if (!content && !imageUrl) {
      return res.status(400).json({ msg: 'Post must have content or image' });
    }

    const newPost = new Post({
      author: req.user.id,
      content: content || '',
      imageUrl: imageUrl || '',
    });

    const post = await newPost.save();
    
    // Populate author details
    await post.populate('author', 'username firstName lastName avatarUrl');
    
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── GET ALL POSTS (FEED) ────────────────────────────────────────────────────
// @route   GET /api/posts/feed
// @desc    Get all posts for feed (paginated)
// @access  Private
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user.id).select('friends following followers');
    const validAuthors = [
      req.user.id, 
      ...(currentUser.friends || []),
      ...(currentUser.following || []),
      ...(currentUser.followers || [])
    ];

    const posts = await Post.find({ author: { $in: validAuthors } })
      .populate('author', 'username firstName lastName avatarUrl')
      .populate('likes', 'username')
      .populate('comments.user', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({ author: { $in: validAuthors } });

    res.json({
      posts,
      totalPosts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── GET ALL POSTS ACROSS PLATFORM ───────────────────────────────────────────
// @route   GET /api/posts/all
// @desc    Get all posts from everyone (for global community feed)
// @access  Private
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username firstName lastName avatarUrl')
      .populate('likes', 'username')
      .populate('comments.user', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(50); // limit to recent 50 for performance

    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── GET USER'S POSTS ────────────────────────────────────────────────────────
// @route   GET /api/posts/user/:userId
// @desc    Get all posts from a specific user
// @access  Private
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'username firstName lastName avatarUrl')
      .populate('likes', 'username')
      .populate('comments.user', 'username avatarUrl')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── LIKE POST ────────────────────────────────────────────────────────────────
// @route   POST /api/posts/:postId/like
// @desc    Like or unlike a post
// @access  Private
router.post('/:postId/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const isLiked = post.likes.some(id => id.toString() === req.user.id);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(like => like.toString() !== req.user.id);
    } else {
      // Like
      post.likes.push(req.user.id);
    }

    await post.save();
    
    await post.populate('author', 'username firstName lastName avatarUrl');
    await post.populate('likes', 'username');
    await post.populate('comments.user', 'username avatarUrl');

    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── ADD COMMENT ────────────────────────────────────────────────────────────
// @route   POST /api/posts/:postId/comment
// @desc    Add a comment to a post
// @access  Private
router.post('/:postId/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ msg: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const newComment = {
      user: req.user.id,
      text: text.trim(),
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    await post.populate('author', 'username firstName lastName avatarUrl');
    await post.populate('likes', 'username');
    await post.populate('comments.user', 'username avatarUrl');

    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── DELETE COMMENT ──────────────────────────────────────────────────────────
// @route   DELETE /api/posts/:postId/comment/:commentId
// @desc    Delete a comment from a post
// @access  Private
router.delete('/:postId/comment/:commentId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ msg: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    comment.deleteOne();
    await post.save();

    await post.populate('author', 'username firstName lastName avatarUrl');
    await post.populate('likes', 'username');
    await post.populate('comments.user', 'username avatarUrl');

    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── DELETE POST ─────────────────────────────────────────────────────────────
// @route   DELETE /api/posts/:postId
// @desc    Delete a post (only by author)
// @access  Private
router.delete('/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Check if user owns the post
    const authorId = post.author._id ? post.author._id.toString() : post.author.toString();
    if (authorId !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.postId);

    res.json({ msg: 'Post deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── GET SAVED POSTS ─────────────────────────────────────────────────────────
// @route   GET /api/posts/saved
// @desc    Get user's saved posts
// @access  Private
router.get('/saved', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ savedBy: req.user.id })
      .populate('author', 'username firstName lastName avatarUrl')
      .populate('likes', 'username')
      .populate('comments.user', 'username avatarUrl')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── SAVE POST ─────────────────────────────────────────────────────────────
// @route   POST /api/posts/:postId/save
// @desc    Toggle save post
// @access  Private
router.post('/:postId/save', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const isSaved = post.savedBy.some(id => id.toString() === req.user.id);

    if (isSaved) {
      // Unsave
      post.savedBy = post.savedBy.filter(id => id.toString() !== req.user.id);
    } else {
      // Save
      post.savedBy.push(req.user.id);
    }

    await post.save();
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
