import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from '../config';

export default function FriendsListSection() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
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
      fetchFriends();
    } else {
      setFriends([]);
      setLoading(false);
    }
  }, [token]);

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/friends`, {
        headers: { "x-auth-token": token }
      });
      const data = await response.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching friends:", err);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Friends</h3>
        <p className="text-xs text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
        👫 Friends
        {friends.length > 0 && (
          <span className="text-xs bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
            {friends.length}
          </span>
        )}
      </h3>

      {friends.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No friends yet. Make some connections!</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {friends.map((friend) => (
            <div
              key={friend._id}
              onClick={() => navigate(`/profile/${friend.username}`)}
              className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {friend.avatarUrl ? (
                  <img
                    src={friend.avatarUrl}
                    alt={friend.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {friend.firstName || friend.username}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">@{friend.username}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${friend.username}`); }}
                className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
