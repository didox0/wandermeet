import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API_URL } from "../config";
export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/profile/${username}`, {
          headers: { "x-auth-token": token }
        });
        const data = await response.json();
        if (response.ok) {
          setProfile(data);
        } else {
          setError(data.msg || "Profile not found");
        }
      } catch (err) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, token, navigate]);

  const handleFollow = async () => {
    try {
      const isUnfollowing = profile.isFriend || profile.isFollowing || profile.isRequested;
      const endpoint = isUnfollowing ? "unfollow" : "follow";
      
      const response = await fetch(`${API_URL}/api/users/${endpoint}/${profile.id}`, {
        method: "POST",
        headers: { "x-auth-token": token }
      });
      const data = await response.json();
      
      if (response.ok) {
        if (isUnfollowing) {
          // Unfollow action completely resets the relationship states locally
          setProfile((prev) => ({
            ...prev,
            isFollowing: false,
            isFriend: false,
            isRequested: false,
            followersCount: Math.max(0, prev.followersCount - 1)
          }));
        } else {
          // Follow action updates based on backend response
          setProfile((prev) => ({
            ...prev,
            isFollowing: true, // We always follow when sending a request or adding friend
            isFriend: data.isFriend || false,
            isRequested: data.isRequested || false,
            followersCount: prev.followersCount + 1
          }));
        }
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      {/* Cover Photo */}
      <div className="pt-14">
        {profile.bannerUrl ? (
          <div className="h-48 md:h-64 w-full relative overflow-hidden bg-slate-200">
            <img 
              src={profile.bannerUrl} 
              alt={`${profile.username}'s Banner`} 
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ imageRendering: "-webkit-optimize-contrast" }} 
            />
          </div>
        ) : (
          <div className="h-48 md:h-64 w-full bg-slate-800 relative overflow-hidden flex items-end justify-center">
            {/* Default mountain lines SVG */}
            <svg className="w-full h-full text-slate-700 opacity-60" preserveAspectRatio="none" viewBox="0 0 100 100" fill="currentColor">
              <polygon points="0,100 15,50 35,100" />
              <polygon points="25,100 50,30 75,100" />
              <polygon points="60,100 80,60 100,100" />
            </svg>
          </div>
        )}
      </div>

      {/* Profile Info Bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 flex items-start gap-5 pb-4 pt-5">
          <div className="relative flex-shrink-0" style={{ marginTop: "-48px" }}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.username} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-white" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-md flex items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-blue-500 to-purple-600">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.firstName || profile.lastName ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : profile.username}
              </h1>
              <div className="text-lg text-gray-500 font-medium mt-1">@{profile.username}</div>
              
              <div className="flex gap-4 mt-3 text-sm">
                <div><span className="font-bold text-gray-900">{profile.followersCount}</span> <span className="text-gray-500">Followers</span></div>
                <div><span className="font-bold text-gray-900">{profile.followingCount}</span> <span className="text-gray-500">Following</span></div>
              </div>
            </div>

            <div className="mt-2">
              <button 
                onClick={handleFollow}
                className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${
                  profile.isFriend || profile.isFollowing || profile.isRequested
                    ? "bg-gray-100 text-gray-800 hover:bg-gray-200" 
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {profile.isFriend ? "Friends" : profile.isRequested ? "Requested" : profile.isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {profile.msg ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">This account is private</h3>
            <p className="text-gray-500">{profile.msg}</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4">About</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {profile.bio || `No bio available for ${profile.username}.`}
                  </p>
                  {profile.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>📍</span> {profile.location}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4">Interests</h3>
                  {profile.interests && profile.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((i, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                          {i}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No interests added yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Travel Log */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🗺️</span>
                <h3 className="font-bold text-gray-900">Travel Log</h3>
                {profile.travelLogs && profile.travelLogs.length > 0 && (
                  <span className="text-xs text-gray-400 font-medium">({profile.travelLogs.length} memories)</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">Captured moments from the road</p>

              {profile.travelLogs && profile.travelLogs.length > 0 ? (
                <div className="grid grid-cols-3 gap-2" style={{ gridAutoRows: "110px" }}>
                  {profile.travelLogs.map((url, i) => (
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">No travel logs yet</p>
                    <p className="text-xs text-gray-400 mt-0.5">{profile.username} hasn't shared any travel memories</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
