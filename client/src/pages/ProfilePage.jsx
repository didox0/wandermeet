import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";import FriendRequestsSection from "../components/FriendRequestsSection";
import FriendsListSection from "../components/FriendsListSection";
import { API_URL } from "../config";





const badges = [
  { label: "Solo Biker", color: "#3b82f6", bg: "#eff6ff" },
  { label: "Safe Traveler", color: "#10b981", bg: "#f0fdf4" },
  { label: "Consistent", color: "#f59e0b", bg: "#fffbeb" },
  { label: "High Altitude", color: "#8b5cf6", bg: "#f5f3ff" },
];

/* ─── Component ──────────────────────────────────────────── */
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("travel-log");
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userSettings, setUserSettings] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    location: "",
    interests: [],
    bio: "",
    altEmail: ""
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileAvatar, setProfileAvatar] = useState(
    () => localStorage.getItem("userAvatar") || ""
  );
  const [profileBanner, setProfileBanner] = useState(
    () => localStorage.getItem("userBanner") || ""
  );
  const [travelLogs, setTravelLogs] = useState([]);
  const [travelLogUploading, setTravelLogUploading] = useState(false);

  const handleBannerUpload = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    // In a real app, you would upload the file to your server here.
    // For now, we simulate it with a local object URL to reflect instantly.
    const tempUrl = URL.createObjectURL(file);
    setProfileBanner(tempUrl);
    
    const token = localStorage.getItem("token");
    if (!token) return;

    const formData = new FormData();
    formData.append("banner", file);

    try {
      const res = await fetch(`${API_URL}/api/auth/upload-banner`, {
        method: "POST",
        headers: { "x-auth-token": token },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bannerUrl) {
           setProfileBanner(data.bannerUrl);
           localStorage.setItem("userBanner", data.bannerUrl);
        }
      }
    } catch (err) {
      console.error("Banner upload failed", err);
    }
  };

  // Fetch travel logs from backend
  const fetchTravelLogs = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/travel-log`, {
        headers: { "x-auth-token": authToken }
      });
      if (res.ok) {
        const data = await res.json();
        setTravelLogs(data.travelLogs || []);
      }
    } catch (err) {
      console.error("Travel log fetch failed", err);
    }
  };

  const handleTravelLogUpload = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const authToken = localStorage.getItem("token");
    if (!authToken) return;

    setTravelLogUploading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch(`${API_URL}/api/auth/travel-log/upload`, {
        method: "POST",
        headers: { "x-auth-token": authToken },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setTravelLogs(data.travelLogs || []);
      } else {
        console.error("Travel log upload server error:", data);
        alert(`Upload failed: ${data.msg || "Server error"}`);
      }
    } catch (err) {
      console.error("Travel log upload failed", err);
      alert("Upload failed: Could not reach the server.");
    } finally {
      setTravelLogUploading(false);
      // Reset file input so the same file can be re-selected
      e.target.value = "";
    }
  };

  const handleTravelLogDelete = async (index) => {
    const authToken = localStorage.getItem("token");
    if (!authToken) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/travel-log/${index}`, {
        method: "DELETE",
        headers: { "x-auth-token": authToken }
      });
      if (res.ok) {
        const data = await res.json();
        setTravelLogs(data.travelLogs || []);
      }
    } catch (err) {
      console.error("Travel log delete failed", err);
    }
  };


  useEffect(() => {
    const handleStorageChange = () => {
      const newToken = localStorage.getItem("token");
      setToken(newToken);
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChanged", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChanged", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const applyData = (data) => {
      setUserSettings({
        username: data.username || "User",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        location: data.location || "Not set",
        interests: Array.isArray(data.interests) ? data.interests : [],
        bio: data.bio || "",
        altEmail: data.altEmail || ""
      });
    };

    // 1. Load from localStorage immediately (fast render)
    const cached = localStorage.getItem("userSettings");
    if (cached) {
      try { applyData(JSON.parse(cached)); } catch (_) { }
    }

    // 2. Fetch fresh data from API (source of truth)
    if (token) {
      fetch(`${API_URL}/api/auth/user-profile`, {
        headers: { "x-auth-token": token }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.username) {
            applyData(data);
            // Sync back to localStorage so Settings also benefits
            const existing = cached ? JSON.parse(cached) : {};
            localStorage.setItem("userSettings", JSON.stringify({
              ...existing,
              username: data.username,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email,
              phone: data.phone || existing.phone || "+91",
              altEmail: data.altEmail || existing.altEmail || "",
              location: data.location || "",
              interests: Array.isArray(data.interests) ? data.interests : [],
              bio: data.bio || ""
            }));
            // Sync avatar — clear if this account has no avatar (prevents bleed from prev account)
            if (data.avatarUrl) {
              localStorage.setItem("userAvatar", data.avatarUrl);
              setProfileAvatar(data.avatarUrl);
            } else {
              localStorage.removeItem("userAvatar");
              setProfileAvatar("");
            }
            // Sync banner
            if (data.bannerUrl) {
              localStorage.setItem("userBanner", data.bannerUrl);
              setProfileBanner(data.bannerUrl);
            } else {
              localStorage.removeItem("userBanner");
              setProfileBanner("");
            }
          }
        })
        .catch(err => console.error("Profile fetch error:", err))
        .finally(() => setProfileLoading(false));

        // 3. Fetch travel logs
        fetchTravelLogs(token);
    } else {
      setProfileLoading(false);
    }

    // Refresh avatar
    const avatar = localStorage.getItem("userAvatar");
    setProfileAvatar(avatar || "");
  }, [token]);

  return (
    <div className="font-sans bg-gray-50 text-gray-900 min-h-screen">
      <Navbar />

      {/* ── Cover Photo ── */}
      <div className="pt-14">
        {profileBanner ? (
          <div className="w-full h-52 md:h-64 relative overflow-hidden bg-slate-200">
            <img 
              src={profileBanner} 
              alt="Profile Banner" 
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ imageRendering: "-webkit-optimize-contrast" }} 
            />
            {/* Subtle gradient at the top just for button contrast, leaving the rest of the image crisp */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-transparent pointer-events-none" />
            {/* Action buttons top-right */}
            <div className="absolute top-4 right-4 flex gap-2">
              <label className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow transition-colors cursor-pointer" title="Change Banner">
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
              </label>
              <Link to="/settings" title="Settings">
                <button className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow transition-colors">
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full h-52 md:h-64 relative bg-slate-800 flex flex-col items-center justify-end overflow-hidden border-b border-gray-200 pb-8">
            {/* Default mountain lines SVG */}
            <svg className="absolute inset-0 w-full h-full text-slate-700 opacity-60" preserveAspectRatio="none" viewBox="0 0 100 100" fill="currentColor">
              <polygon points="0,100 15,50 35,100" />
              <polygon points="25,100 50,30 75,100" />
              <polygon points="60,100 80,60 100,100" />
            </svg>
            
            <div className="relative z-10 flex flex-col items-center gap-2">
              <label className="cursor-pointer bg-white text-gray-700 hover:text-blue-600 hover:bg-gray-50 border border-gray-300 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload Banner
                <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
              </label>
              <p className="text-gray-400 text-xs font-medium bg-slate-900/40 px-3 py-1 rounded-full">Recommended size: 1400x400px</p>
            </div>
            
            {/* Action buttons top-right */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <Link to="/settings">
                <button className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow transition-colors">
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Profile Info Bar ── */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 flex items-start gap-5 pb-4 pt-5">
            <div className="relative flex-shrink-0" style={{ marginTop: "-48px" }}>
              {profileAvatar ? (
                <img
                  src={profileAvatar}
                  alt={userSettings.username}
                  className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #4F6EF7, #7C3AED)" }}
                >
                  {userSettings.username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
            </div>


            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">


                <h1 className="text-xl font-bold text-gray-900">
                  {userSettings.firstName || userSettings.lastName
                    ? `${userSettings.firstName} ${userSettings.lastName}`.trim()
                    : userSettings.username}
                </h1>
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              {(userSettings.firstName || userSettings.lastName) && (
                <div className="text-[18px] text-gray-500 font-medium -mt-1 mb-1">
                  @{userSettings.username}
                </div>
              )}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {userSettings.location}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 flex flex-col lg:flex-row gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* About Me (Moved) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3">About Me</h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                {userSettings.bio || "No bio yet."}
              </p>
              <div className="space-y-3 text-xs text-gray-500 flex justify-between items-center">
                <div>
                  {userSettings.interests && userSettings.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {userSettings.interests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-full border border-blue-100"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="italic text-gray-400">No interests listed yet.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">✦ Joined</span>
                  <span>March 2022</span>
                </div>
              </div>
            </div>

            {/* Travel Log */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">🗺️</span>
                  <h2 className="font-bold text-gray-900 text-sm">Travel Log</h2>
                  <span className="text-xs text-gray-400 font-medium">({travelLogs.length} memories)</span>
                </div>
                <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                  travelLogUploading 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}>
                  {travelLogUploading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Memory
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={travelLogUploading}
                    onChange={handleTravelLogUpload}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mb-4">Captured moments from the road</p>

              {travelLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="text-4xl mb-3">📸</div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">No memories yet</p>
                  <p className="text-xs text-gray-400">Click "Add Memory" to upload your first travel photo</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2" style={{ gridAutoRows: "110px" }}>
                  {travelLogs.map((url, i) => (
                    <div
                      key={i}
                      className={`relative rounded-xl overflow-hidden group cursor-pointer ${
                        i === 1 ? "row-span-2" : i === 5 ? "col-span-2" : ""
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Travel memory ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Delete button on hover */}
                      <button
                        onClick={() => handleTravelLogDelete(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>


          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="lg:w-64 flex-shrink-0 space-y-4">

            {/* Friend Requests */}
            <FriendRequestsSection key={token} />

            {/* Friends List */}
            <FriendsListSection key={token} />



          </div>
        </div>
      </div>
    </div>
  );
}
