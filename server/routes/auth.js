const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const { upload, uploadBanner, uploadTravelLog } = require("../config/cloudinary");

// ─── Gmail transporter — nodemailer v6, explicit SMTP for max deliverability ─
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,          // STARTTLS on port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASS || "").replace(/\s/g, ""), // strip spaces from App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
});



// ─── SIGNUP ────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || username.trim() === "") {
    return res.status(400).json({ msg: "Username is required" });
  }

  try {
    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername)
      return res.status(400).json({ msg: "Traveler already exists" });

    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ msg: "Email already exists" });

    const user = new User({ username: username.trim(), email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token, username: user.username });
      }
    );
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const msg =
        field === "username"
          ? "Username is already taken"
          : "Email is already registered";
      return res.status(400).json({ msg });
    }
    res.status(500).send("Server Error");
  }
});

// ─── LOGIN ─────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid Credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Wrong password" });

    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token, username: user.username });
      }
    );
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// ─── FORGOT PASSWORD ────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal whether the account exists
      return res.json({ msg: "No account found with that email address." });
    }

    // Generate secure reset token valid for 1 hour
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    await transporter.sendMail({
      from: `"WanderMeet 🌍" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset your WanderMeet password",
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
          <h2 style="color:#111;margin-bottom:8px;">Reset your password</h2>
          <p style="color:#555;font-size:14px;">Hi <strong>${user.username}</strong>,</p>
          <p style="color:#555;font-size:14px;">
            We received a request to reset your WanderMeet password.
            Click the button below — the link is valid for <strong>1 hour</strong>.
          </p>
          <a href="${resetLink}"
             style="display:inline-block;margin:20px 0;padding:13px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
            Reset Password
          </a>
          <p style="color:#9ca3af;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
          <p style="color:#bbb;font-size:11px;">WanderMeet — Connect. Explore. Wander.</p>
        </div>
      `,
    });

    res.json({ msg: "Reset link sent! Check your inbox (and spam folder)." });

  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ msg: "Failed to send reset email. Please try again." });
  }
});


// ─── RESET PASSWORD — validates token & saves new password ────────────────

router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Token must not be expired
    });

    if (!user)
      return res
        .status(400)
        .json({ msg: "Reset link is invalid or has expired." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: "Password reset successfully! You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).send("Server Error");
  }
});

// ─── UPLOAD AVATAR ─────────────────────────────────────────────────────────
router.post("/upload-avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Cloudinary secure URL extraction across different library versions
    const avatarUrl = req.file.path || req.file.secure_url || req.file.url || '';
    if (!avatarUrl) {
      console.error('Cloudinary did not return a valid URL:', req.file);
      return res.status(500).json({ msg: 'Image upload failed on the server' });
    }
    user.avatarUrl = avatarUrl;
    await user.save();

    res.json({ msg: "Avatar uploaded successfully", avatarUrl: user.avatarUrl });
  } catch (err) {
    console.error("Avatar upload error:", err.message);
    res.status(500).json({ msg: "Failed to upload avatar" });
  }
});

// ─── UPLOAD BANNER ─────────────────────────────────────────────────────────
router.post("/upload-banner", authMiddleware, uploadBanner.single("banner"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Cloudinary secure URL extraction across different library versions
    const bannerUrl = req.file.path || req.file.secure_url || req.file.url || '';
    if (!bannerUrl) {
      console.error('Cloudinary did not return a valid URL:', req.file);
      return res.status(500).json({ msg: 'Image upload failed on the server' });
    }
    user.bannerUrl = bannerUrl;
    await user.save();

    res.json({ msg: "Banner uploaded successfully", bannerUrl: user.bannerUrl });
  } catch (err) {
    console.error("Banner upload error:", err.message);
    res.status(500).json({ msg: "Failed to upload banner" });
  }
});

// ─── TRAVEL LOG – UPLOAD PHOTO ─────────────────────────────────────────────
router.post("/travel-log/upload", authMiddleware, uploadTravelLog.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const photoUrl = req.file.path || req.file.secure_url || req.file.url || "";
    if (!photoUrl) return res.status(500).json({ msg: "Image upload failed on the server" });

    // Safety: initialize array if undefined (old documents before schema update)
    if (!Array.isArray(user.travelLogs)) {
      user.travelLogs = [];
    }

    user.travelLogs.push(photoUrl);
    await user.save();

    res.json({ msg: "Photo added to travel log", travelLogs: user.travelLogs });
  } catch (err) {
    console.error("Travel log upload error:", err.message);
    res.status(500).json({ msg: "Failed to upload travel log photo", detail: err.message });
  }
});

// ─── TRAVEL LOG – GET MY PHOTOS ─────────────────────────────────────────────
router.get("/travel-log", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("travelLogs");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ travelLogs: user.travelLogs || [] });
  } catch (err) {
    console.error("Travel log fetch error:", err.message);
    res.status(500).json({ msg: "Failed to fetch travel log" });
  }
});

// ─── TRAVEL LOG – DELETE PHOTO ──────────────────────────────────────────────
router.delete("/travel-log/:index", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const idx = parseInt(req.params.index, 10);
    if (isNaN(idx) || idx < 0 || idx >= user.travelLogs.length) {
      return res.status(400).json({ msg: "Invalid photo index" });
    }

    user.travelLogs.splice(idx, 1);
    await user.save();

    res.json({ msg: "Photo removed", travelLogs: user.travelLogs });
  } catch (err) {
    console.error("Travel log delete error:", err.message);
    res.status(500).json({ msg: "Failed to delete travel log photo" });
  }
});

// ─── UPDATE PROFILE ────────────────────────────────────────────────────────
router.post("/update-profile", authMiddleware, async (req, res) => {
  const { username, email, phone, location, interests, bio, altEmail, firstName, lastName, isPrivate } = req.body;
  const userId = req.user.id;

  console.log("Update profile request:", { userId, altEmail, body: req.body }); // Debug log

  try {
    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^\+91\d{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          msg: "Phone number must be +91 followed by exactly 10 digits (e.g., +919876543210)"
        });
      }

      // Check for duplicate phone (excluding current user)
      const existingPhone = await User.findOne({
        phone: phone,
        _id: { $ne: userId }
      });
      if (existingPhone) {
        return res.status(400).json({ msg: "Phone number already in use" });
      }
    }

    // Check for duplicate username (if changed)
    if (username) {
      const existingUsername = await User.findOne({
        username: username.trim(),
        _id: { $ne: userId }
      });
      if (existingUsername) {
        return res.status(400).json({ msg: "Username already taken" });
      }
    }

    // Check for duplicate email (if changed)
    if (email) {
      const existingEmail = await User.findOne({
        email: email.trim(),
        _id: { $ne: userId }
      });
      if (existingEmail) {
        return res.status(400).json({ msg: "Email already registered" });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const primaryEmail = (email ? email.trim() : user.email || "").toLowerCase();
    const normalizedAltEmail = altEmail ? altEmail.trim().toLowerCase() : "";
    if (normalizedAltEmail && normalizedAltEmail === primaryEmail) {
      return res.status(400).json({ msg: "Alternative email must be different from your primary email" });
    }

    // Update fields
    if (username) user.username = username.trim();
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (email) user.email = email.trim();
    if (phone) user.phone = phone;
    if (location) user.location = location.trim();
    if (interests !== undefined) user.interests = Array.isArray(interests) ? interests : [];
    if (bio) user.bio = bio.trim();
    if (altEmail !== undefined) {
      user.altEmail = altEmail ? altEmail.trim() : "";
    }
    if (isPrivate !== undefined) user.isPrivate = isPrivate;

    await user.save();

    console.log("User saved:", { id: user._id, altEmail: user.altEmail }); // Debug log

    res.json({
      msg: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        location: user.location,
        interests: user.interests,
        bio: user.bio,
        altEmail: user.altEmail,
        avatarUrl: user.avatarUrl || null,
        isPrivate: user.isPrivate || false
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const msg = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
      return res.status(400).json({ msg });
    }
    console.error("Update profile error:", err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ─── GET USER PROFILE ──────────────────────────────────────────────────────
router.get("/user-profile", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ─── SEND LOCATION VIA EMAIL ───────────────────────────────────────────────
router.post("/send-location-email", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, locationUrl } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!user.altEmail || !user.altEmail.trim()) {
      return res.status(400).json({ msg: "Alternative email not configured. Please add an alternative email in Settings." });
    }

    const emailContent = `
      <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;">
        <h2 style="color:#dc2626;margin:0 0 8px 0;">🚨 WanderMeet Safety Alert</h2>
        <p style="color:#555;font-size:14px;margin:0 0 16px 0;">HI, I am <strong>${user.firstName || user.username}</strong>.</p>
        
        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:16px 0;border-radius:4px;">
          <p style="color:#dc2626;margin:0 0 12px 0;font-weight:bold;">📍 Your Location Details:</p>
          <p style="color:#555;margin:8px 0;"><strong>Latitude:</strong> ${latitude.toFixed(4)}</p>
          <p style="color:#555;margin:8px 0;"><strong>Longitude:</strong> ${longitude.toFixed(4)}</p>
          <p style="color:#999;margin:8px 0;font-size:12px;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <a href="${locationUrl}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#dc2626;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            🗺️ View on Google Maps
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;margin:16px 0 0 0;border-top:1px solid #e5e7eb;padding-top:16px;">
          This location was shared via WanderMeet's safety feature. Stay safe!
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"WanderMeet 🚨" <${process.env.EMAIL_USER}>`,
      to: user.altEmail.trim(),
      subject: "🚨 Safety Alert: Location Shared - WanderMeet",
      html: emailContent
    });

    res.json({ 
      msg: "Location sent successfully to alternative email",
      sent_to: [user.altEmail.trim()],
      count: 1
    });
  } catch (err) {
    console.error("Send location email error:", err.message);
    res.status(500).json({ msg: "Failed to send location: " + err.message });
  }
});

module.exports = router;
