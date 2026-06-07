import { useState, useEffect } from "react";
import { API_URL } from '../config';

export default function FriendRequestsSection() {
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Listen for token changes (account switching)
  useEffect(() => {
    const handleStorageChange = () => {
      const newToken = localStorage.getItem("token");
      setToken(newToken);
      setLoading(true);
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChanged", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChanged", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (token) {
      fetchFriendRequests();
    } else {
      setFriendRequests([]);
      setLoading(false);
    }
  }, [token]);

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/friend-requests`, {
        headers: { "x-auth-token": token }
      });
      const data = await response.json();
      setFriendRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching friend requests:", err);
      setFriendRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: "accepting" }));
    try {
      const response = await fetch(
        `${API_URL}/api/users/friend-request/accept/${userId}`,
        {
          method: "POST",
          headers: { "x-auth-token": token }
        }
      );
      
      if (response.ok) {
        setFriendRequests(prev => prev.filter(req => req._id !== userId));
      }
    } catch (err) {
      console.error("Error accepting friend request:", err);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleReject = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: "rejecting" }));
    try {
      const response = await fetch(
        `${API_URL}/api/users/friend-request/reject/${userId}`,
        {
          method: "POST",
          headers: { "x-auth-token": token }
        }
      );
      
      if (response.ok) {
        setFriendRequests(prev => prev.filter(req => req._id !== userId));
      }
    } catch (err) {
      console.error("Error rejecting friend request:", err);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Friend Requests</h3>
        <p className="text-xs text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
        👥 Friend Requests
        {friendRequests.length > 0 && (
          <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
            {friendRequests.length}
          </span>
        )}
      </h3>

      {friendRequests.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No pending friend requests</p>
      ) : (
        <div className="space-y-3">
          {friendRequests.map((request) => (
            <div key={request._id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {request.avatarUrl ? (
                  <img
                    src={request.avatarUrl}
                    alt={request.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {request.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {request.firstName || request.username}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">@{request.username}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleAccept(request._id)}
                  disabled={actionLoading[request._id]}
                  className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading[request._id] === "accepting" ? "..." : "✓"}
                </button>
                <button
                  onClick={() => handleReject(request._id)}
                  disabled={actionLoading[request._id]}
                  className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading[request._id] === "rejecting" ? "..." : "✕"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
