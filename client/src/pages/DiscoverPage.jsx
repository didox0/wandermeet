import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import MapSection from "../components/MapSection";
import Footer from "../components/Footer";
import UserSearchModal from "../components/UserSearchModal";

export default function DiscoverPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("Biking");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setShowPrompt(true);
    } else if (location.state?.showLoginPrompt) {
      setShowPrompt(true);
      // Clear the state so it doesn't reappear on normal refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, token]);

  return (
    <>
      <div className="font-sans bg-white text-gray-900" style={{ filter: isSearchOpen ? "blur(8px)" : "none", transition: "filter 0.3s ease" }}>
        {/* Upper section - Always visible and interactive */}
        <Navbar />
        
        <Hero 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter}
          showPrompt={showPrompt}
          onOpenSearch={() => {
            if (!token) setShowPrompt(true);
            else setIsSearchOpen(true);
          }} 
        />

        {/* Lower section - Blurred and protected if not logged in */}
        <div style={{
          filter: showPrompt ? "blur(8px)" : "none",
          transition: "filter 0.3s ease",
          pointerEvents: showPrompt ? "none" : "auto",
          userSelect: showPrompt ? "none" : "auto"
        }}>
          <MapSection 
            activeFilter={activeFilter} 
            onOpenSearch={() => {
              if (!token) setShowPrompt(true);
              else setIsSearchOpen(true);
            }}
          />
          <Footer />
        </div>
      </div>

      {/* Login Prompt Overlay (Over full page, below Navbar) */}
      {showPrompt && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(255, 255, 255, 0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 40, padding: "20px"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.95)", padding: "40px", borderRadius: "16px",
            textAlign: "center", maxWidth: "420px", width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
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
      )}

      {/* Search Modal (rendered outside the blurred div) */}
      {isSearchOpen && token && (
        <UserSearchModal onClose={() => setIsSearchOpen(false)} />
      )}
    </>
  );
}
