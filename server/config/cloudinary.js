const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Avatar storage ────────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "wandermeet/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  },
});

const upload = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit for posts/avatars
});

// ─── Group cover image storage ────────────────────────────────────────────────
const groupImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "wandermeet/groups",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 800, height: 400, crop: "fill", gravity: "center" }],
  },
});

const uploadGroupImage = multer({
  storage: groupImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ─── Post image storage ───────────────────────────────────────────────────────
const postImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "wandermeet/posts",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1200, height: 1200, crop: "limit" }], // Keep original ratio, scale down if huge
  },
});

const uploadPostImage = multer({
  storage: postImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Banner storage ───────────────────────────────────────────────────────────
const bannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "wandermeet/banners",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1400, height: 400, crop: "fill", gravity: "center" }],
  },
});

const uploadBanner = multer({
  storage: bannerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Travel Log storage ───────────────────────────────────────────────────────
const travelLogStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "wandermeet/travel-logs",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto:best" }],
  },
});

const uploadTravelLog = multer({
  storage: travelLogStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

module.exports = { cloudinary, upload, uploadGroupImage, uploadPostImage, uploadBanner, uploadTravelLog };
