import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_URL } from '../config';

export default function UserSearchModal({ onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Listen for token changes (account switching)
  useEffect(() => {
    const handleStorageChange = () => {
      const newToken = localStorage.getItem("token");
      setToken(newToken);
      setResults([]);
      setLoading(false);
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChanged", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChanged", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!query.trim() || !token) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
          headers: { "x-auth-token": token }
        });
        const data = await response.json();
        if (response.ok) {
          setResults(data);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, token]);

  const handleFollow = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/users/follow/${userId}`, {
        method: "POST",
        headers: { "x-auth-token": token }
      });
      if (response.ok) {
        const data = await response.json();
        // Optimistically update the UI to show 'Requested' or 'Friends' depending on privacy
        setResults((prev) => 
          prev.map((u) => u._id === userId ? { ...u, isRequested: data.isRequested, isFriend: data.isFriend } : u)
        );
      } else {
        const data = await response.json();
        setError(data.msg || "Failed to send request");
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      zIndex: 100, paddingTop: "80px",
      backdropFilter: "blur(8px)"
    }}>
      <div style={{
        background: "white", borderRadius: "16px",
        width: "100%", maxWidth: "500px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden", display: "flex", flexDirection: "column",
        maxHeight: "80vh"
      }}>
        {/* Header & Input */}
        <div style={{ padding: "20px", borderBottom: "1px solid #F3F4F6", position: "relative" }}>
          <button 
            onClick={onClose}
            style={{ position: "absolute", right: "20px", top: "20px", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", marginBottom: "16px" }}>Find Travelers</h2>
          
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: "12px", top: "12px", color: "#9CA3AF" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search by username or name..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%", padding: "12px 16px 12px 40px",
                background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "12px",
                fontSize: "15px", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>
          {error && <p style={{ color: "#EF4444", fontSize: "13px", marginTop: "8px" }}>{error}</p>}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#6B7280" }}>Searching...</div>
          ) : results.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {results.map((user) => (
                <div key={user._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Link 
                    to={`/profile/${user.username}`} 
                    onClick={onClose}
                    style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #4F6EF7, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "20px" }}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#111827" }}>
                        {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : user.username}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px", color: "#6B7280" }}>@{user.username}</span>
                        {user.isPrivate && (
                          <span style={{ fontSize: "11px", background: "#F3F4F6", color: "#4B5563", padding: "2px 6px", borderRadius: "4px" }}>Private</span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <button 
                    onClick={() => handleFollow(user._id)}
                    disabled={user.isFriend || user.isRequested || user.isFollowing}
                    style={{
                      padding: "6px 16px", borderRadius: "999px", fontSize: "13px", fontWeight: "600", 
                      cursor: (user.isFriend || user.isRequested || user.isFollowing) ? "default" : "pointer",
                      background: (user.isFriend || user.isRequested || user.isFollowing) ? "#F3F4F6" : "#4F6EF7",
                      color: (user.isFriend || user.isRequested || user.isFollowing) ? "#374151" : "white",
                      border: (user.isFriend || user.isRequested || user.isFollowing) ? "1px solid #E5E7EB" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    {user.isFriend ? "Friends" : (user.isRequested || user.isFollowing) ? "Requested" : "Add Friend"}
                  </button>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#6B7280" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
              <p>No travelers found matching "{query}"</p>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#6B7280" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>👋</div>
              <p>Search for fellow travelers by username or name to start connecting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
