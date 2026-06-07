import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API_URL } from "../config";

const PREDEFINED_INTERESTS = [
  "Solo Travel", "Hiking", "Photography", "Backpacking", "Foodie",
  "Culture & Heritage", "Wildlife", "Nightlife", "Adventure Sports", "Road Trips",
  "History & Architecture", "Beach & Coastal", "Mountain Trekking", "Budget Travel", "Luxury Travel",
  "Camping", "Cycling", "Motorcycling", "Scuba Diving", "Yoga Retreats"
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("normal"); // normal, saving, saved
  const [customInterest, setCustomInterest] = useState("");
  const fileInputRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);      // actual File to upload
  const [avatarPreview, setAvatarPreview] = useState("");   // local blob URL for preview
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem("userSettings");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      return {
        username: parsed.username || "",
        firstName: parsed.firstName || "",
        lastName: parsed.lastName || "",
        email: parsed.email || "",
        phone: parsed.phone || "+91",
        altEmail: parsed.altEmail || "",
        location: parsed.location || "",
        interests: Array.isArray(parsed.interests) ? parsed.interests : [],
        bio: parsed.bio || "",
        isPrivate: parsed.isPrivate || false
      };
    }
    return {
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "+91",
      altEmail: "",
      location: "",
      interests: [],
      bio: "",
      isPrivate: false
    };
  });

  // Fetch real user data from API on mount so form is pre-filled after login
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_URL}/api/auth/user-profile`, {
      headers: { "x-auth-token": token }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.username) {
          setFormData(prev => ({
            ...prev,
            username: data.username || prev.username,
            firstName: data.firstName || prev.firstName,
            lastName: data.lastName || prev.lastName,
            email: data.email || prev.email,
            phone: data.phone || prev.phone || "+91",
            altEmail: data.altEmail || prev.altEmail || "",
            location: data.location || prev.location || "",
            interests: Array.isArray(data.interests) && data.interests.length > 0
              ? data.interests
              : prev.interests,
            bio: data.bio || prev.bio || "",
            isPrivate: data.isPrivate || false
          }));
          // Load avatar from Cloudinary URL stored in DB
          if (data.avatarUrl) {
            setAvatarPreview(data.avatarUrl);
            localStorage.setItem("userAvatar", data.avatarUrl);
          } else {
            // New account or no avatar — clear any leftover avatar from previous account
            setAvatarPreview("");
            setAvatarFile(null);
            localStorage.removeItem("userAvatar");
          }
        }
      })
      .catch(err => console.error("Settings fetch error:", err));
  }, []);

  const validatePhone = (phoneValue) => {
    const phoneRegex = /^\+91\d{10}$/;
    return phoneRegex.test(phoneValue);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Phone: always keeps "+91" prefix, limits digits after it to exactly 10
  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    // Always keep the +91 prefix
    const prefix = "+91";
    if (!raw.startsWith(prefix)) {
      setFormData(prev => ({ ...prev, phone: prefix }));
      return;
    }
    const digits = raw.slice(3).replace(/\D/g, ""); // Only digits after +91
    if (digits.length > 10) return;                  // Block beyond 10 digits
    setFormData(prev => ({ ...prev, phone: prefix + digits }));
    if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: "Image must be under 2MB" }));
      return;
    }
    setAvatarFile(file);
    // Show instant local preview without uploading yet
    setAvatarPreview(URL.createObjectURL(file));
    setErrors(prev => ({ ...prev, avatar: "" }));
  };

  const handleAddInterest = (interest) => {
    const trimmed = interest.trim();
    if (!trimmed) return;
    if (formData.interests.length >= 5) {
      setErrors(prev => ({ ...prev, interests: "You can add a maximum of 5 interests." }));
      return;
    }
    if (formData.interests.map(i => i.toLowerCase()).includes(trimmed.toLowerCase())) return;
    setFormData(prev => ({ ...prev, interests: [...prev.interests, trimmed] }));
    setErrors(prev => ({ ...prev, interests: "" }));
  };

  const handleRemoveInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
    setErrors(prev => ({ ...prev, interests: "" }));
  };

  const handleCustomInterestKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddInterest(customInterest);
      setCustomInterest("");
    }
  };

  const handleCustomInterestAdd = () => {
    handleAddInterest(customInterest);
    setCustomInterest("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First Name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last Name is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (
      formData.altEmail.trim() &&
      formData.altEmail.trim().toLowerCase() === formData.email.trim().toLowerCase()
    ) {
      newErrors.altEmail = "Alternative email must be different from your primary email";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = "Phone must be +91 followed by 10 digits";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setSaveStatus("saving");
    const token = localStorage.getItem("token");

    console.log("Saving profile altEmail:", formData.altEmail);

    try {
      // ── Step 1: Upload avatar to Cloudinary (only if a new file was picked) ──
      if (avatarFile) {
        setUploadingAvatar(true);
        const formDataImg = new FormData();
        formDataImg.append("avatar", avatarFile);
        const uploadRes = await fetch(`${API_URL}/api/auth/upload-avatar`, {
          method: "POST",
          headers: { "x-auth-token": token || "" },
          body: formDataImg
        });
        const uploadData = await uploadRes.json();
        setUploadingAvatar(false);
        if (!uploadRes.ok) {
          setErrors({ avatar: uploadData.msg || "Avatar upload failed" });
          setSaveStatus("normal");
          setLoading(false);
          return;
        }
        // Store Cloudinary URL in localStorage for instant Navbar/Profile update
        localStorage.setItem("userAvatar", uploadData.avatarUrl);
        setAvatarPreview(uploadData.avatarUrl);
        setAvatarFile(null);
        window.dispatchEvent(new Event("localStorageChanged"));
      }

      // ── Step 2: Save profile fields ────────────────────────────────────────
      const response = await fetch(`${API_URL}/api/auth/update-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token || ""
        },
        body: JSON.stringify({
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          altEmail: formData.altEmail,
          location: formData.location,
          interests: formData.interests,
          bio: formData.bio,
          isPrivate: formData.isPrivate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.msg || "Failed to update profile";
        let fieldError = "submit";
        if (msg.toLowerCase().includes("username")) fieldError = "username";
        else if (msg.toLowerCase().includes("email")) fieldError = "email";
        else if (msg.toLowerCase().includes("alternative email")) fieldError = "altEmail";
        else if (msg.toLowerCase().includes("phone")) fieldError = "phone";
        setErrors({ [fieldError]: msg });
        setSaveStatus("normal");
        setLoading(false);
        return;
      }

      localStorage.setItem("userSettings", JSON.stringify(formData));
      window.dispatchEvent(new Event("localStorageChanged"));
      setSaveStatus("saved");
      setLoading(false);

      setTimeout(() => {
        setSaveStatus("normal");
        navigate("/profile");
      }, 2000);

    } catch (err) {
      setErrors({ submit: err.message || "Network error" });
      setSaveStatus("normal");

      setLoading(false);
    }
  };

  return (
    <div className="font-sans bg-gray-50 text-gray-900 min-h-screen">
      <Navbar />

      <div className="pt-24 pb-12 max-w-3xl mx-auto px-4 md:px-6">
        <div className="mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Profile
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account details and preferences.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">

            {/* Profile Picture Section */}
            <div className="flex items-center gap-6 pb-6 border-b border-gray-50">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-4 border-gray-50 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-gray-50 shadow-sm flex items-center justify-center text-3xl font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #4F6EF7, #7C3AED)" }}
                  >
                    {formData.username ? formData.username.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
                {/* hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-white hover:bg-blue-600 transition-colors shadow"
                  title="Change photo"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Profile Picture</h3>
                <p className="text-xs text-gray-500 mt-1 mb-2">JPG, PNG or GIF · Max 2 MB</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Upload New
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPreview("");
                      setAvatarFile(null);
                      localStorage.removeItem("userAvatar");
                      window.dispatchEvent(new Event("localStorageChanged"));
                    }}
                    className="ml-2 text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Remove
                  </button>
                )}
                {avatarFile && (
                  <p className="text-xs text-amber-600 mt-1">⚡ New photo selected — will upload on Save</p>
                )}
                {errors.avatar && <p className="text-xs text-red-500 mt-1">{errors.avatar}</p>}
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* First Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">First Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${errors.firstName ? 'border-red-300 focus:ring-red-100' : 'border-gray-200'}`}
                  />
                </div>
                {errors.firstName && <p className="text-xs text-red-600">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Last Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${errors.lastName ? 'border-red-300 focus:ring-red-100' : 'border-gray-200'}`}
                  />
                </div>
                {errors.lastName && <p className="text-xs text-red-600">{errors.lastName}</p>}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Username *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${errors.username ? 'border-red-300 focus:ring-red-100' : 'border-gray-200'}`}
                  />
                </div>
                {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Email Address *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${errors.email ? 'border-red-300 focus:ring-red-100' : 'border-gray-200'}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Phone Number * (10 digits)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="+919876543210"
                    maxLength={13}
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${errors.phone ? 'border-red-300 focus:ring-red-100' : 'border-gray-200'}`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
              </div>

              {/* Alt Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Alternative Email (For Safety Alerts)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    name="altEmail"
                    value={formData.altEmail}
                    onChange={handleChange}
                    placeholder="emergency@email.com"
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${errors.altEmail ? 'border-red-300 focus:ring-red-100' : 'border-gray-200'}`}
                  />
                </div>
                {errors.altEmail && <p className="text-xs text-red-600">{errors.altEmail}</p>}
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Location</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Bio / About Me</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell fellow travelers a bit about yourself..."
                  className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none resize-none"
                />
              </div>

              {/* ── INTERESTS ── */}
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">
                    Travel Interests
                  </label>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${formData.interests.length >= 5 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                    {formData.interests.length}/5
                  </span>
                </div>

                {/* Selected Interest Tags */}
                <div className="min-h-[42px] flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  {formData.interests.length === 0 ? (
                    <span className="text-xs text-gray-400 italic self-center">
                      No interests added yet — select from below or type a custom one.
                    </span>
                  ) : (
                    formData.interests.map((interest, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-sm"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(interest)}
                          className="hover:bg-blue-500 rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors"
                          title="Remove"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {errors.interests && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.interests}
                  </p>
                )}

                {/* Predefined Interests Chips */}
                {formData.interests.length < 5 && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Quick add:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PREDEFINED_INTERESTS
                        .filter(i => !formData.interests.map(x => x.toLowerCase()).includes(i.toLowerCase()))
                        .map((interest, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddInterest(interest)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
                          >
                            + {interest}
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Custom Interest Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={formData.interests.length >= 5 ? "Max 5 interests reached" : "Type a custom interest & press Enter..."}
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    onKeyDown={handleCustomInterestKeyDown}
                    disabled={formData.interests.length >= 5}
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={handleCustomInterestAdd}
                    disabled={formData.interests.length >= 5 || !customInterest.trim()}
                    className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

            </div>

            {errors.submit && (
              <p className="text-xs text-red-600 bg-red-50 px-4 py-2 rounded-lg">{errors.submit}</p>
            )}

            {/* ── Privacy Toggle ── */}
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
                  {formData.isPrivate ? (
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{formData.isPrivate ? "Private Account" : "Public Account"}</p>
                  <p className="text-xs text-gray-500">{formData.isPrivate ? "Only followers can see your full profile" : "Everyone can see your profile details"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isPrivate ? "bg-amber-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.isPrivate ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-5 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || saveStatus === "saved"}
                className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-sm ${
                  saveStatus === "saved"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                }`}
              >
                {uploadingAvatar ? "⬆ Uploading photo..." : saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "✓ Settings Saved" : "Save Changes"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
