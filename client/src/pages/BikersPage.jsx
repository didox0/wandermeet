import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import axios from "axios";
import { API_URL } from "../config";

export default function BikersPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allRides, setAllRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  // Modals
  const [activeRide, setActiveRide] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editRideId, setEditRideId] = useState(null);
  const [deleteConfirmRideId, setDeleteConfirmRideId] = useState(null);
  const [leaveConfirmRideId, setLeaveConfirmRideId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef(null);

  // Create Form State
  const [formData, setFormData] = useState({
    routeName: "",
    distance: "",
    difficulty: "Medium",
    startLocation: "",
    startDate: "",
    privacy: "public",
    maxParticipants: 20,
    image: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch User
      const userRes = await axios.get(`${API_URL}/api/auth/user-profile`, {
        headers: { "x-auth-token": token }
      });
      setCurrentUser(userRes.data);

      // Fetch Rides
      const ridesRes = await axios.get(`${API_URL}/api/rides/all`, {
        headers: { "x-auth-token": token }
      });
      setAllRides(ridesRes.data.rides || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      const msg = err.response?.data?.msg || err.response?.data || err.message || "Failed to load data.";
      showToast("❌ " + (typeof msg === 'string' ? msg : JSON.stringify(msg)));
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4500);
  };

  const pickImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setEditRideId(null);
    setFormData({ routeName: "", distance: "", difficulty: "Medium", startLocation: "", endLocation: "", startDate: "", privacy: "public", maxParticipants: 20, image: null });
    setImagePreview(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (ride) => {
    setEditMode(true);
    setEditRideId(ride._id);
    setFormData({
      routeName: ride.routeName,
      distance: ride.distance,
      difficulty: ride.difficulty,
      startLocation: ride.startLocation,
      endLocation: ride.endLocation || "",
      startDate: ride.startDate ? ride.startDate.split("T")[0] : "",
      privacy: ride.privacy || "public",
      maxParticipants: ride.maxParticipants || 20,
      image: null
    });
    setImagePreview(ride.imageUrl || null);
    setActiveRide(null); // close details modal
    setIsCreateModalOpen(true);
  };

  const handleCreateRide = async (e) => {
    e.preventDefault();
    if (!formData.routeName || !formData.distance || !formData.startLocation || !formData.startDate) {
      return showToast("❌ Please fill in all required fields.");
    }

    setIsSubmitting(true);

    const jsonPayload = {
      routeName: formData.routeName,
      distance: formData.distance,
      difficulty: formData.difficulty,
      privacy: formData.privacy,
      startLocation: formData.startLocation,
      endLocation: formData.endLocation,
      startDate: formData.startDate,
      maxParticipants: formData.maxParticipants,
    };

    try {
      const url = editMode
        ? `${API_URL}/api/rides/${editRideId}`
        : `${API_URL}/api/rides/create`;

      const method = editMode ? axios.put : axios.post;

      const res = await method(url, jsonPayload, {
        headers: { "x-auth-token": token, "Content-Type": "application/json" }
      });

      const rideId = res.data._id;

      if (formData.image && rideId) {
        const imageFd = new FormData();
        imageFd.append("image", formData.image);
        await axios.patch(`${API_URL}/api/rides/${rideId}/image`, imageFd, {
          headers: { "x-auth-token": token }
        });
      }

      setIsCreateModalOpen(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.msg || err.response?.data || err.message || "Unknown error";
      showToast("❌ " + (typeof msg === 'string' ? msg : JSON.stringify(msg)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRide = (rideId) => {
    setDeleteConfirmRideId(rideId);
  };

  const confirmDeleteRide = async () => {
    if (!deleteConfirmRideId) return;
    try {
      await axios.delete(`${API_URL}/api/rides/${deleteConfirmRideId}`, {
        headers: { "x-auth-token": token }
      });
      setActiveRide(null);
      setDeleteConfirmRideId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to delete ride.");
    }
  };

  const handleJoinRide = async (rideId) => {
    try {
      await axios.post(`${API_URL}/api/rides/${rideId}/join`, {}, {
        headers: { "x-auth-token": token }
      });
      fetchData();
      setActiveRide(null);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.msg || "❌ Failed to join ride.");
    }
  };

  const handleLeaveRide = (rideId) => {
    setLeaveConfirmRideId(rideId);
  };

  const confirmLeaveRide = async () => {
    if (!leaveConfirmRideId) return;
    try {
      await axios.post(`${API_URL}/api/rides/${leaveConfirmRideId}/leave`, {}, {
        headers: { "x-auth-token": token }
      });
      fetchData();
      setActiveRide(null);
      setLeaveConfirmRideId(null);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.msg || "❌ Failed to leave ride.");
    }
  };

  const handleAcceptRequest = async (rideId, userId) => {
    try {
      await axios.post(`${API_URL}/api/rides/${rideId}/requests/${userId}/accept`, {}, {
        headers: { "x-auth-token": token }
      });
      fetchData();
      setActiveRide(null);
      showToast("✅ Request accepted!");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.msg || "❌ Failed to accept request.");
    }
  };

  const handleRejectRequest = async (rideId, userId) => {
    try {
      await axios.post(`${API_URL}/api/rides/${rideId}/requests/${userId}/reject`, {}, {
        headers: { "x-auth-token": token }
      });
      fetchData();
      setActiveRide(null);
      showToast("✅ Request rejected.");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.msg || "❌ Failed to reject request.");
    }
  };

  // Compute Personal & Global Rides
  const personalRides = allRides.filter(r => {
    if (!currentUser) return false;
    const isHost = r.author?._id === currentUser._id;
    const isJoined = r.riders?.some(rider => rider._id === currentUser._id);
    const isFriendHost = currentUser.friends?.includes(r.author?._id);
    return isHost || isJoined || isFriendHost;
  });

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case "Easy": return "#10b981";
      case "Medium": return "#f59e0b";
      case "Hard": return "#ef4444";
      case "Expert": return "#7f1d1d";
      default: return "#f59e0b";
    }
  };

  const renderRideCard = (r, isCompact = false) => {
    const displayDate = new Date(r.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const isJoined = currentUser && r.riders?.some(rider => rider._id === currentUser._id);
    const isRequested = currentUser && r.joinRequests?.some(reqUser => reqUser._id === currentUser._id);
    const isHost = currentUser && r.author?._id === currentUser._id;
    const isFull = r.riders?.length >= (r.maxParticipants || 20);
    const bgColors = ['linear-gradient(135deg, #fceabb 0%, #f8b500 100%)', 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)'];
    const bg = bgColors[r._id.charCodeAt(0) % bgColors.length];

    if (isCompact) {
      return (
        <div
          key={r._id}
          className="bg-white rounded-[16px] overflow-hidden border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center p-3 gap-3 cursor-pointer group"
          onClick={() => setActiveRide(r)}
        >
          <div className="w-[70px] h-[70px] rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: bg }}>
            {r.imageUrl ? (
              <img src={r.imageUrl} alt={r.routeName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl absolute inset-0 bg-black/10 backdrop-blur-[2px]">🛣️</div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[14px] font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors leading-tight mb-1">{r.routeName}</p>
            <div className="text-[12px] text-gray-500 flex items-center gap-1.5 overflow-hidden w-full">
              <span className="truncate max-w-[80px]">By {r.author?.username || 'Host'}</span>
              <span className="whitespace-nowrap flex-shrink-0 text-gray-400">• {r.distance}km</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-gray-600 font-bold bg-gray-100 px-1.5 py-0.5 rounded-full leading-none">📅 {displayDate}</span>
            </div>
          </div>

          {/* Action button at the right of compact card */}
          <div className="flex-shrink-0 flex items-center pr-1">
            {currentUser && !isHost && (
              <button
                disabled={isJoined || isRequested || isFull}
                onClick={(e) => { e.stopPropagation(); if (!isJoined && !isRequested && !isFull) handleJoinRide(r._id); }}
                className={`w-[96px] h-[36px] rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1 border ${
                  isJoined
                    ? 'bg-green-50 text-green-600 border-green-200 cursor-default'
                    : isRequested
                      ? 'bg-amber-50 text-amber-600 border-amber-200 cursor-default'
                      : isFull
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-default'
                        : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 cursor-pointer'
                  }`}
              >
                {isJoined ? (
                  <>Joined</>
                ) : isRequested ? (
                  <><span className="text-sm">⏳</span> Requested</>
                ) : isFull ? (
                  <>Full</>
                ) : (
                  <>Join</>
                )}
              </button>
            )}
            {isHost && (
              <div className="w-[96px] h-[36px] flex items-center justify-center gap-1 rounded-xl text-[12px] font-bold bg-gray-100 text-gray-500 border border-gray-200 cursor-default">
                👑 Host
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        key={r._id}
        onClick={() => setActiveRide(r)}
        className="bg-white rounded-[20px] overflow-hidden border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
      >
        <div className="relative h-[180px] overflow-hidden" style={{ background: bg }}>
          {r.imageUrl ? (
            <img src={r.imageUrl} alt={r.routeName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="absolute -bottom-2 -right-2 text-[70px] opacity-15 select-none">🛣️</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/55" />

          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/15 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getDifficultyColor(r.difficulty) }}></span>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{r.difficulty}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/15 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
                {r.privacy === 'public' ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                )}
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{r.privacy}</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <h3 className="m-0 text-[18px] font-extrabold text-white leading-tight drop-shadow-md truncate pr-2">{r.routeName}</h3>
            <img
              src={r.author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.author?.firstName || r.author?.username || 'User')}&background=random`}
              alt={r.author?.username}
              className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover flex-shrink-0"
              title={`Hosted by ${r.author?.username}`}
            />
          </div>
        </div>

        {/* Map Visualization UI */}
        <div className="pt-3 px-3 pb-0">
          <div className="relative w-full h-[60px] bg-slate-50/80 rounded-xl border border-gray-100 p-2.5 flex items-center justify-between overflow-hidden group-hover:border-blue-100 group-hover:bg-blue-50/30 transition-colors">
            {/* Route line */}
            <div className="absolute top-1/2 left-[40px] right-[40px] h-[2px] -translate-y-1/2 bg-gray-200 border-t-[1.5px] border-dashed border-gray-300" />
            <div className="absolute top-1/2 left-[40px] right-[40px] h-[2px] -translate-y-1/2 bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: '60%' }} />

            {/* Start Point */}
            <div className="z-10 flex flex-col items-center gap-1 w-12">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-sm z-10" />
              <span className="text-[9px] font-bold text-gray-500 truncate w-[55px] text-center" title={r.startLocation}>{r.startLocation?.split(',')[0] || 'Start'}</span>
            </div>

            {/* Riders on the road */}
            <div className="absolute top-1/2 left-[45px] right-[45px] -translate-y-[12px] flex items-center h-[24px] pointer-events-none">
              {r.riders?.slice(0, 5).map((rider, i) => (
                <div
                  key={rider._id || i}
                  className="absolute pointer-events-none"
                  style={{
                    animation: `driveBike ${5 + (i % 3)}s linear infinite`,
                    animationDelay: `${i * 1.1}s`,
                    zIndex: 10 - i
                  }}
                >
                  <div className="relative flex flex-col items-center w-8 -ml-4">
                    <img
                      src={rider.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(rider.username || 'U')}&size=24&background=random`}
                      alt="rider"
                      className="w-5 h-5 rounded-full border-[1.5px] border-white shadow-sm object-cover bg-white z-10 -mb-1.5"
                    />
                    <span className="text-[12px] drop-shadow-sm" style={{ transform: 'scaleX(-1)' }}>🏍️</span>
                  </div>
                </div>
              ))}
              {r.riders?.length > 5 && (
                <div
                  className="absolute bg-white border border-gray-200 text-gray-600 text-[8px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                  style={{ left: `90%`, zIndex: 4 }}
                >
                  +{r.riders.length - 5}
                </div>
              )}
            </div>

            {/* End Point */}
            <div className="z-10 flex flex-col items-center gap-1 w-12">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-500 bg-white shadow-sm z-10 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              </div>
              <span className="text-[9px] font-bold text-gray-500 truncate w-[55px] text-center" title={r.endLocation || r.routeName}>
                {((r.endLocation === r.startLocation && r.routeName?.includes('-')) ? r.routeName.split('-')[1].trim() : (r.endLocation || r.startLocation || 'End'))?.split(',')[0]}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 pt-2 flex flex-col gap-3 flex-1">
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-gray-600 font-medium">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              {r.distance} km
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              {displayDate}
            </span>
            <span className="flex items-center gap-1.5 ml-auto text-gray-800 font-bold bg-gray-100 px-2 py-0.5 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              {r.riderCount}
            </span>
          </div>

          <div className="mt-auto pt-2">
            {!currentUser ? (
              <button className="w-full py-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl text-[13px] font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
                View Route <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            ) : isHost ? (
              <div className="w-full py-2.5 rounded-xl text-[13px] font-bold bg-gray-100 text-gray-500 text-center border border-gray-200">
                👑 You are the Host
              </div>
            ) : isJoined ? (
              <div className="flex gap-2 w-full">
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveRide(r); }}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-white text-blue-600 border-[1.5px] border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
                >
                  View Details
                </button>
                <div onClick={(e) => e.stopPropagation()} className="flex-[0.8] py-2.5 rounded-xl text-[13px] font-bold bg-green-50 text-green-600 border border-green-200 flex items-center justify-center gap-1.5 cursor-default">
                  Joined
                </div>
              </div>
            ) : isRequested ? (
              <button
                disabled
                className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 cursor-default"
              >
                <span className="text-sm">⏳</span> Requested
              </button>
            ) : isFull ? (
              <button
                disabled
                className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200 cursor-default"
              >
                Full
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleJoinRide(r._id); }}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <span className="text-sm">{r.privacy === 'private' ? '🔒' : '🚀'}</span> {r.privacy === 'private' ? 'Request Join' : 'Join Route'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const mapStyle = `
    @keyframes driveBike {
      0% { left: 5%; opacity: 0; transform: translateY(0); }
      10% { opacity: 1; transform: translateY(-2px); }
      20% { transform: translateY(0); }
      30% { transform: translateY(-2px); }
      40% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
      60% { transform: translateY(0); }
      70% { transform: translateY(-2px); }
      80% { transform: translateY(0); }
      90% { opacity: 1; transform: translateY(-2px); }
      100% { left: 95%; opacity: 0; transform: translateY(0); }
    }
  `;

  return (
    <div className="font-sans bg-gray-50 text-gray-900 min-h-screen relative">
      <style>{mapStyle}</style>
      <Navbar />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-800 animate-bounce">
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage("")} className="text-gray-400 hover:text-white font-bold text-xs">✕</button>
        </div>
      )}

      <div className="pt-14">
        {/* Hero */}
        <div
          className="relative overflow-hidden bg-gray-900 px-6 text-center"
          style={{ height: "600px", display: "flex", flexDirection: "column", justifyContent: "center" }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.5, zIndex: 0 }}
          >
            <source src="/bg-video-bike.mp4" type="video/mp4" />
          </video>
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-block text-xs font-semibold text-orange-400 uppercase tracking-widest bg-orange-400/10 border border-orange-400/30 px-3 py-1 rounded-full mb-3">
              Biker Hub
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Ride Together</h1>
            <p className="text-gray-300 text-sm md:text-base mb-6">
              Create your own epic routes, discover global rides, and connect with bikers heading your way.
            </p>
            <button
              onClick={openCreateModal}
              className="bg-orange-500 text-white text-sm font-semibold px-8 py-3 rounded-full hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              + Post a Ride Route
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8">
          {/* Left — Personal Rides */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-xl">🏍️ My Rides & Friends</h2>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading rides...</div>
            ) : personalRides.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {personalRides.map(r => renderRideCard(r, false))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">🛣️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No personal rides yet</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm">
                  You haven't posted any routes, nor joined any rides. Create your own epic journey to get started!
                </p>
                <button
                  onClick={openCreateModal}
                  className="bg-orange-50 text-orange-600 font-semibold px-6 py-2.5 rounded-full border border-orange-200 hover:bg-orange-100 transition-colors"
                >
                  + Create Route
                </button>
              </div>
            )}
          </div>

          {/* Right — Global Rides */}
          <div className="lg:w-80 flex-shrink-0">
            <h2 className="font-bold text-gray-900 text-lg mb-5 flex items-center justify-between">
              <span>🌍 Overall Routes</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-semibold">{allRides.length}</span>
            </h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : allRides.length === 0 ? (
                <div className="text-sm text-gray-500">No rides available.</div>
              ) : (
                allRides.map(r => renderRideCard(r, true))
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Modals are placed below */}      {/* Ride Details Modal (Modernized) */}
      {activeRide && (
        <div className="fixed inset-0 z-[1050] bg-[#0f172a]/65 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setActiveRide(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-[24px] max-w-[800px] w-full max-h-[90vh] overflow-y-auto shadow-[0_32px_80px_rgba(0,0,0,0.3)] animate-fade-in flex flex-col relative">

            {/* Header / Cover */}
            <div className="relative h-[250px] w-full bg-slate-200">
              {activeRide.imageUrl ? (
                <img src={activeRide.imageUrl} alt={activeRide.routeName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl bg-gradient-to-br from-slate-200 to-slate-300">🛣️</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

              <button
                onClick={() => setActiveRide(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 backdrop-blur-md text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg transition-colors border border-white/20"
              >
                ✕
              </button>

              <div className="absolute bottom-6 left-8 right-8 text-white flex justify-between items-end">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block shadow-sm" style={{ backgroundColor: getDifficultyColor(activeRide.difficulty) }}>
                    {activeRide.difficulty} ROUTE
                  </span>
                  <h3 className="text-3xl font-extrabold drop-shadow-md mb-2">{activeRide.routeName}</h3>
                  <div className="flex items-center gap-2">
                    <img src={activeRide.author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRide.author?.firstName || activeRide.author?.username)}&background=random`} alt="host" className="w-6 h-6 rounded-full border border-white shadow-sm" />
                    <p className="text-sm font-medium text-slate-200">Hosted by {activeRide.author?.firstName || activeRide.author?.username}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              {/* Modern Map Visualization inside Modal */}
              <div className="relative w-full h-[80px] bg-slate-50/80 rounded-2xl border border-slate-100 p-4 flex items-center justify-between overflow-hidden mb-8 shadow-sm">
                <div className="absolute top-1/2 left-[60px] right-[60px] h-[3px] -translate-y-1/2 bg-slate-200 border-t-2 border-dashed border-slate-300" />
                <div className="absolute top-1/2 left-[60px] right-[60px] h-[3px] -translate-y-1/2 bg-blue-500 opacity-80" style={{ width: '60%' }} />

                <div className="z-10 flex flex-col items-center gap-1.5 w-20">
                  <div className="w-5 h-5 rounded-full bg-blue-500 border-4 border-white shadow-md z-10" />
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-center break-words leading-tight">{activeRide.startLocation?.split(',')[0]}</span>
                </div>

                <div className="absolute top-1/2 left-[70px] right-[70px] -translate-y-[16px] flex items-center h-[32px] pointer-events-none">
                  {activeRide.riders?.slice(0, 7).map((rider, i) => (
                    <div
                      key={rider._id || i}
                      className="absolute pointer-events-none"
                      style={{
                        animation: `driveBike ${5 + (i % 3)}s linear infinite`,
                        animationDelay: `${i * 1.3}s`,
                        zIndex: 20 - i
                      }}
                    >
                      <div className="relative flex flex-col items-center w-10 -ml-5">
                        <img src={rider.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(rider.username || 'U')}&background=random`} className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover bg-white z-10 -mb-2" />
                        <span className="text-[16px] drop-shadow-sm" style={{ transform: 'scaleX(-1)' }}>🏍️</span>
                      </div>
                    </div>
                  ))}
                  {activeRide.riders?.length > 7 && (
                    <div className="absolute bg-white border border-slate-200 text-slate-600 text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-md" style={{ left: `90%`, zIndex: 4 }}>
                      +{activeRide.riders.length - 7}
                    </div>
                  )}
                </div>

                <div className="z-10 flex flex-col items-center gap-1.5 w-20">
                  <div className="w-5 h-5 rounded-full border-4 border-orange-500 bg-white shadow-md z-10 flex items-center justify-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-center break-words leading-tight">
                    {((activeRide.endLocation === activeRide.startLocation && activeRide.routeName?.includes('-')) ? activeRide.routeName.split('-')[1].trim() : (activeRide.endLocation || activeRide.startLocation || 'End'))?.split(',')[0]}
                  </span>
                </div>
              </div>

              {/* Stats & Info */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-100">
                  <span className="text-2xl mb-1">🗺️</span>
                  <span className="text-lg font-bold text-slate-800">{activeRide.distance} km</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Distance</span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-100">
                  <span className="text-2xl mb-1">📅</span>
                  <span className="text-lg font-bold text-slate-800">{new Date(activeRide.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date</span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-100">
                  <span className="text-2xl mb-1">👥</span>
                  <span className="text-lg font-bold text-slate-800">{activeRide.riderCount} <span className="text-sm text-slate-400">/ {activeRide.maxParticipants}</span></span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Riders</span>
                </div>
              </div>

              {activeRide.description && (
                <div className="mb-8">
                  <h4 className="text-[13px] font-extrabold text-slate-800 mb-2 uppercase tracking-widest">Route Description</h4>
                  <p className="text-[15px] text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100">{activeRide.description}</p>
                </div>
              )}

              {/* Full Address details */}
              <div className="mb-8">
                <h4 className="text-[13px] font-extrabold text-slate-800 mb-2 uppercase tracking-widest">Starting Address</h4>
                <p className="text-[14px] text-slate-600 font-medium">{activeRide.startLocation}</p>
              </div>

              {/* Host's Pending Requests UI */}
              {currentUser && activeRide.author?._id === currentUser._id && activeRide.privacy === 'private' && activeRide.joinRequests?.length > 0 && (
                <div className="mb-8 border border-amber-200 bg-amber-50 rounded-2xl p-4">
                  <h4 className="text-[13px] font-extrabold text-amber-800 mb-3 uppercase tracking-widest flex items-center gap-2"><span>🔔</span> Pending Requests</h4>
                  <div className="space-y-2">
                    {activeRide.joinRequests.map(reqUser => (
                      <div key={reqUser._id} className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-amber-100">
                        <div className="flex items-center gap-2">
                          <img src={reqUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reqUser.username || 'U')}&background=random`} className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
                          <span className="font-bold text-[14px] text-gray-800">{reqUser.username}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAcceptRequest(activeRide._id, reqUser._id)} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center font-bold" title="Accept">✅</button>
                          <button onClick={() => handleRejectRequest(activeRide._id, reqUser._id)} className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center font-bold" title="Reject">❌</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex gap-4 border-t border-slate-100">
                {currentUser && activeRide.author?._id === currentUser._id ? (
                  <>
                    <button onClick={() => openEditModal(activeRide)} className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">⚙️ Edit Settings</button>
                    <button onClick={() => handleDeleteRide(activeRide._id)} className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">🗑️ Delete Route</button>
                    <div className="flex-1 text-center py-3.5 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold border border-slate-200 flex items-center justify-center">👑 You are Host</div>
                  </>
                ) : activeRide.riders?.some(r => r._id === currentUser?._id) ? (
                  <>
                    <button onClick={() => handleLeaveRide(activeRide._id)} className="flex-[0.4] py-3.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 transition-colors">Leave Ride</button>
                    <div className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-600 border-2 border-emerald-200 flex items-center justify-center gap-2 cursor-default">
                      You are Joined
                    </div>
                  </>
                ) : activeRide.joinRequests?.some(r => r._id === currentUser?._id) ? (
                  <>
                    <button onClick={() => handleLeaveRide(activeRide._id)} className="flex-[0.4] py-3.5 rounded-xl text-sm font-bold bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50 hover:border-red-200 hover:text-red-600 transition-colors">Cancel</button>
                    <div className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-amber-50 text-amber-600 border-2 border-amber-200 flex items-center justify-center gap-2 cursor-default">
                      <span className="text-lg leading-none">⏳</span> Request Sent
                    </div>
                  </>
                ) : (
                  <button onClick={() => handleJoinRide(activeRide._id)} disabled={activeRide.riderCount >= activeRide.maxParticipants} className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50">
                    {activeRide.riderCount >= activeRide.maxParticipants ? "Route is Full" : activeRide.privacy === 'private' ? "🔒 Request to Join" : "🚀 Join this Route"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Ride Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-[#0f172a]/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsCreateModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-[24px] max-w-[500px] w-full max-h-[92vh] overflow-y-auto shadow-[0_32px_80px_rgba(0,0,0,0.25)]">
            {/* Header */}
            <div className="px-7 pt-6 flex justify-between items-center">
              <div>
                <h3 className="m-0 text-[22px] font-extrabold text-[#0f172a]">{editMode ? '🏍️ Edit Ride Route' : '🏍️ Post a Ride Route'}</h3>
                <p className="m-0 mt-1 text-[13px] text-[#94a3b8]">{editMode ? 'Update your epic journey' : 'Plan your next epic motorcycle journey'}</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="bg-[#f1f5f9] border-none w-9 h-9 rounded-full text-xl cursor-pointer text-[#64748b] flex items-center justify-center hover:bg-[#e2e8f0] transition-colors">×</button>
            </div>

            <div className="p-7">
              <form id="createRideForm" onSubmit={handleCreateRide}>
                {/* Cover Image Upload */}
                <div className="mb-5">
                  <label className="block text-[12px] font-bold text-[#475569] mb-2 uppercase tracking-wider">Cover Image</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`w-full h-[140px] rounded-[16px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative transition-colors ${imagePreview ? 'border-transparent bg-transparent' : 'border-[#cbd5e1] hover:border-[#2563eb] bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]'}`}
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center">
                          <span className="text-[22px]">📷</span>
                          <span className="text-white text-[12px] font-semibold mt-1">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[28px] mb-2">🖼️</span>
                        <span className="text-[13px] font-semibold text-[#475569]">Click to upload cover image</span>
                        <span className="text-[11px] text-[#94a3b8] mt-1">JPG, PNG, WebP · Max 5 MB</span>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
                </div>

                {/* Form Fields */}
                <div className="mb-3.5">
                  <label className="block text-[12px] font-bold text-[#475569] mb-1.5 uppercase tracking-wider">Route Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spiti Valley Circuit"
                    value={formData.routeName}
                    onChange={e => setFormData({ ...formData, routeName: e.target.value })}
                    className="w-full border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[#2563eb]"
                  />
                </div>

                <div className="flex gap-3 mb-3.5">
                  <div className="flex-1">
                    <label className="block text-[12px] font-bold text-[#475569] mb-1.5 uppercase tracking-wider">Distance (km) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 450"
                      value={formData.distance}
                      onChange={e => setFormData({ ...formData, distance: e.target.value })}
                      className="w-full border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[#2563eb]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[12px] font-bold text-[#475569] mb-1.5 uppercase tracking-wider">Difficulty *</label>
                    <select
                      value={formData.difficulty}
                      onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[#2563eb] bg-white"
                    >
                      <option value="Easy">🟢 Easy</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Hard">🟠 Hard</option>
                      <option value="Expert">🔴 Expert</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mb-3.5">
                  <div className="flex-1">
                    <label className="block text-[12px] font-bold text-[#475569] mb-1.5 uppercase tracking-wider">Start Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mumbai"
                      value={formData.startLocation}
                      onChange={e => setFormData({ ...formData, startLocation: e.target.value })}
                      className="w-full border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[#2563eb]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[12px] font-bold text-[#475569] mb-1.5 uppercase tracking-wider">End Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Goa"
                      value={formData.endLocation}
                      onChange={e => setFormData({ ...formData, endLocation: e.target.value })}
                      className="w-full border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[#2563eb]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-[12px] font-bold text-[#475569] mb-1.5 uppercase tracking-wider">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[#2563eb]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[12px] font-bold text-[#475569] mb-1.5 uppercase tracking-wider">Max Riders *</label>
                    <input
                      type="number"
                      required
                      min={2}
                      max={1000}
                      value={formData.maxParticipants}
                      onChange={e => setFormData({ ...formData, maxParticipants: e.target.value === '' ? '' : parseInt(e.target.value) })}
                      className="w-full border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[#2563eb]"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[12px] font-bold text-[#475569] mb-1.5 uppercase tracking-wider">Privacy</label>
                  <div className="flex gap-2">
                    {['public', 'private'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, privacy: p })}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all border-[1.5px] ${formData.privacy === p ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                        {p === 'public' ? '🌐 Public' : '🔒 Private'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white rounded-[14px] text-[15px] font-extrabold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
                >
                  {isSubmitting ? "✨ Saving..." : editMode ? "💾 Save Changes" : "🚀 Create Route"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmRideId && (
        <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl">
                ⚠️
              </div>
              <h3 className="text-gray-900 text-lg font-bold">Delete Route?</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete this ride? This action cannot be undone and will remove the route permanently.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmRideId(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRide}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Leave Confirmation Modal */}
      {leaveConfirmRideId && (
        <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xl">
                ⚠️
              </div>
              <h3 className="text-gray-900 text-lg font-bold">Leave Route?</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Are you sure you want to leave this ride? You'll need to join again if you change your mind.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setLeaveConfirmRideId(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeaveRide}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-md"
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
