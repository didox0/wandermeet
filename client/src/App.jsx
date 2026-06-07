import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import CommunityPage from "./pages/CommunityPage";
import DiscoverPage from "./pages/DiscoverPage";
import BikersPage from "./pages/BikersPage";
import PopularRoutesPage from "./pages/PopularRoutesPage";
import ProfilePage from "./pages/ProfilePage";
import SafetyPage from "./pages/SafetyPage";
import SettingsPage from "./pages/SettingsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PublicProfilePage from "./pages/PublicProfilePage";

// A simple wrapper to protect routes
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  if (!token) {
    return (
      <div className="unauth-wrapper" style={{ position: "relative", minHeight: "100vh" }}>
        <style>{`
          .unauth-wrapper > .page-content > div > *:not(nav) {
            filter: blur(8px);
            pointer-events: none;
            user-select: none;
            transition: filter 0.3s ease;
          }
        `}</style>

        {/* Render the actual page (which contains Navbar) */}
        <div className="page-content">{children}</div>

        {/* Login Prompt Overlay */}
        <div style={{
          position: "fixed", top: "56px", left: 0, right: 0, bottom: 0,
          background: "rgba(255, 255, 255, 0.4)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          zIndex: 40, paddingTop: "80px", overflowY: "auto"
        }}>
          <div style={{
            background: "white", padding: "40px", borderRadius: "16px",
            textAlign: "center", maxWidth: "420px", width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            marginBottom: "40px"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🌍</div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "12px", color: "#111827" }}>
              Ready to Explore?
            </h2>
            <p style={{ fontSize: "15px", color: "#4B5563", marginBottom: "28px", lineHeight: "1.6" }}>
              You must log in or sign up first to access our community features, discover new bikers, and view profiles!
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "10px 32px", borderRadius: "999px", border: "none",
                  background: "#4F6EF7", color: "white", fontWeight: "600", cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#3B5EDB"}
                onMouseOut={(e) => e.currentTarget.style.background = "#4F6EF7"}
              >
                Login / Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/discover" replace />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/safety" element={<ProtectedRoute><SafetyPage /></ProtectedRoute>} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Protected Routes */}
        <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/bikers" element={<ProtectedRoute><BikersPage /></ProtectedRoute>} />
        <Route path="/popular" element={<ProtectedRoute><PopularRoutesPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute><PublicProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Routes>
      {/* WanderMeet AI removed */}
    </BrowserRouter>
  );
}