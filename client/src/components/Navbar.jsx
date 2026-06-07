import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { API_URL } from '../config';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navLinkStyle = (path) => ({
    display: "flex",
    alignItems: "center",
    gap: "4px",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "600",
    color: location.pathname === path ? "#4F6EF7" : "#374151",
    position: "relative",
    paddingBottom: "2px",
    transition: "color 0.2s ease",
  });

  const navIconStroke = (path) =>
    location.pathname === path ? "#4F6EF7" : "#9CA3AF";
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [displayUsername, setDisplayUsername] = useState("User");
  const [profileAvatar, setProfileAvatar] = useState("");
  const dropdownRef = useRef(null);

  const token = localStorage.getItem("token");

  // Load username from localStorage and listen for changes
  useEffect(() => {
    const updateUsername = () => {
      const userSettings = localStorage.getItem("userSettings");
      if (userSettings) {
        try {
          const settings = JSON.parse(userSettings);
          if (settings.firstName || settings.lastName) {
            setDisplayUsername(`${settings.firstName || ""} ${settings.lastName || ""}`.trim());
          } else {
            setDisplayUsername(settings.username || "User");
          }
        } catch (err) {
          setDisplayUsername("User");
        }
      } else {
        const storedUsername = localStorage.getItem("username");
        setDisplayUsername(storedUsername || "User");
      }
      // Load avatar
      const avatar = localStorage.getItem("userAvatar");
      setProfileAvatar(avatar || "");
    };

    // Initial load from localStorage (fast)
    updateUsername();

    // Fetch fresh data from API if logged in
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${API_URL}/api/auth/user-profile`, {
        headers: { "x-auth-token": token }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.username) {
            if (data.firstName || data.lastName) {
              setDisplayUsername(`${data.firstName || ""} ${data.lastName || ""}`.trim());
            } else {
              setDisplayUsername(data.username);
            }
            // Sync to localStorage
            const cached = localStorage.getItem("userSettings");
            const existing = cached ? JSON.parse(cached) : {};
            localStorage.setItem("userSettings", JSON.stringify({
              ...existing,
              username: data.username,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email
            }));
            // Sync avatar — clear if this account has no avatar
            if (data.avatarUrl) {
              localStorage.setItem("userAvatar", data.avatarUrl);
              setProfileAvatar(data.avatarUrl);
            } else {
              localStorage.removeItem("userAvatar");
              setProfileAvatar("");
            }
          }
        })
        .catch(() => { });
    }

    // Listen for storage changes
    window.addEventListener("storage", updateUsername);
    const handleStorageChange = () => { updateUsername(); };
    window.addEventListener("localStorageChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", updateUsername);
      window.removeEventListener("localStorageChanged", handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userSettings");
    localStorage.removeItem("userAvatar");  // Clear avatar so next account starts fresh
    window.dispatchEvent(new Event("localStorageChanged"));
    navigate("/");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 50,
      background: "white",
      borderBottom: "1px solid #F3F4F6",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "56px"
    }}>

      {/* ── Logo + Brand ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img
          src={logo}
          alt="Wander Meet"
          style={{
            width: "28px",
            height: "28px",
            objectFit: "contain",
            flexShrink: 0,
            borderRadius: "6px"
          }}
        />
        <span style={{
          fontWeight: "700",
          color: "#4F6EF7",
          fontSize: "16px",
        }}>
          Wander Meet
        </span>
      </div>

      {/* ── Nav Links matching PDF icons exactly ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>

        {/* Discover - compass/location icon */}
        <Link to="/discover" style={navLinkStyle("/discover")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={navIconStroke("/discover")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          Discover
          {location.pathname === "/discover" && (
            <span style={{
              position: "absolute",
              bottom: "-10px",
              left: 0,
              right: 0,
              height: "2px",
              background: "#4F6EF7",
              borderRadius: "2px",
            }} />
          )}
        </Link>

        {/* Community - people icon */}
        <Link to="/community" style={navLinkStyle("/community")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={navIconStroke("/community")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Community
          {location.pathname === "/community" && (
            <span style={{
              position: "absolute",
              bottom: "-10px",
              left: 0,
              right: 0,
              height: "2px",
              background: "#4F6EF7",
              borderRadius: "2px",
            }} />
          )}
        </Link>

        {/* Bikers - bike/mountain icon */}
        <Link to="/bikers" style={navLinkStyle("/bikers")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={navIconStroke("/bikers")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 17 9 11 13 15 19 9" />
            <polyline points="14 9 19 9 19 14" />
          </svg>
          Bikers
          {location.pathname === "/bikers" && (
            <span style={{
              position: "absolute",
              bottom: "-10px",
              left: 0,
              right: 0,
              height: "2px",
              background: "#4F6EF7",
              borderRadius: "2px",
            }} />
          )}
        </Link>


      </div>

      {/* ── Right: SOS + Profile ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {!token && (
          <Link to="/login" style={{ textDecoration: "none" }}>
            <button
              style={{
                background: "#4F6EF7",
                color: "white",
                fontSize: "13px",
                fontWeight: "600",
                padding: "6px 16px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#3B5EDB"; e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#4F6EF7"; e.currentTarget.style.transform = "scale(1)"; }}
            >
              Get Started
            </button>
          </Link>
        )}

        <Link to="/safety" style={{ textDecoration: "none" }}>
          <button
            style={{
              background: "white",
              color: "#EF4444",
              fontSize: "12px",
              fontWeight: "700",
              padding: "6px 16px",
              borderRadius: "999px",
              border: "1.5px solid #EF4444",
              boxShadow: "0 2px 4px rgba(239, 68, 68, 0.1)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              letterSpacing: "0.5px",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => { 
              e.currentTarget.style.background = "#EF4444"; 
              e.currentTarget.style.color = "white"; 
              e.currentTarget.style.transform = "translateY(-1px)"; 
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(239, 68, 68, 0.25)";
            }}
            onMouseOut={(e) => { 
              e.currentTarget.style.background = "white"; 
              e.currentTarget.style.color = "#EF4444"; 
              e.currentTarget.style.transform = "translateY(0)"; 
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(239, 68, 68, 0.1)";
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 20h20L12 2z" />
            </svg>
            SOS
          </button>
        </Link>

        {token && (
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                background: "transparent",
                border: "1px solid #E5E7EB",
                borderRadius: "999px",
                padding: "4px 12px 4px 6px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                color: "#374151",
                fontSize: "13px",
                fontWeight: "500"
              }}
            >
              {profileAvatar ? (
                <img
                  src={profileAvatar}
                  alt={displayUsername}
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1.5px solid #E5E7EB"
                  }}
                />
              ) : (
                <div style={{
                  background: "linear-gradient(135deg, #4F6EF7, #7C3AED)",
                  borderRadius: "50%",
                  width: "26px",
                  height: "26px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "white",
                  flexShrink: 0
                }}>
                  {displayUsername.charAt(0).toUpperCase()}
                </div>
              )}
              {displayUsername}
              <span style={{ fontSize: "10px", marginLeft: "2px", color: "#9CA3AF" }}>▼</span>
            </button>

            {isDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                background: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                minWidth: "160px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                zIndex: 100
              }}>
                <Link
                  to="/profile"
                  style={{ padding: "10px 16px", textDecoration: "none", color: "#374151", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "#F9FAFB"; e.currentTarget.style.color = "#4F6EF7"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#374151"; }}
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Profile
                </Link>
                <Link
                  to="/settings"
                  style={{ padding: "10px 16px", textDecoration: "none", color: "#374151", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #F3F4F6" }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "#F9FAFB"; e.currentTarget.style.color = "#4F6EF7"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#374151"; }}
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  style={{
                    padding: "10px 16px",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    color: "#EF4444",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    fontFamily: "inherit"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </nav>
  );
}