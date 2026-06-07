import { useEffect, useState } from "react";
import { API_URL } from '../config';

export default function Hero({ onOpenSearch, activeFilter, onFilterChange, showPrompt }) {
  const [stats, setStats] = useState({
    activeTravelers: 0,
    countriesCovered: 1,
    activeRoutes: 0
  });

  useEffect(() => {
    fetch(`${API_URL}/api/stats`)
      .then(res => res.json())
      .then(data => {
        setStats({
          activeTravelers: data.activeTravelers || 0,
          countriesCovered: 1, // Fixed as per request
          activeRoutes: data.activeRoutes || 0
        });
      })
      .catch(err => console.error("Error fetching stats:", err));
  }, []);
  return (
    <section style={{ paddingTop: "56px" }}>

      {/* ── Hero Video Background ── */}
      <div style={{
        position: "relative",
        height: "600px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {/* Video Element */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            filter: showPrompt ? "blur(4px)" : "none",
            transition: "filter 0.3s ease"
          }}
        >
          <source src="/bg-video-travel.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.55) 100%)"
        }} />

        {/* Content */}
        <div style={{ 
          position: "relative", zIndex: 2, textAlign: "center", padding: "0 16px", maxWidth: "640px",
          filter: showPrompt ? "blur(8px)" : "none",
          transition: "filter 0.3s ease",
          pointerEvents: showPrompt ? "none" : "auto",
          userSelect: showPrompt ? "none" : "auto"
        }}>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center",
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "999px",
            padding: "4px 14px",
            marginBottom: "20px"
          }}>
            <span style={{ color: "white", fontSize: "12px", fontWeight: "500" }}>
              #1 Community for Solo Explorers
            </span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: "Sora, sans-serif",
            color: "white",
            fontSize: "42px",
            fontWeight: "800",
            lineHeight: "1.15",
            marginBottom: "16px"
          }}>
            Find Your Next{" "}
            <span style={{ color: "#60A5FA", fontStyle: "italic" }}>Adventure</span>
            <br />Companion
          </h1>

          {/* Subtext */}
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "15px", lineHeight: "1.6", marginBottom: "28px" }}>
            Wander Meet connects you with like-minded travelers across India.<br />
            Explore maps, join communities, and never travel alone again.
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={onOpenSearch}
              style={{
                background: "#4F6EF7",
                color: "white",
                fontWeight: "600",
                fontSize: "14px",
                padding: "12px 28px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#3B5EDB"}
              onMouseOut={(e) => e.currentTarget.style.background = "#4F6EF7"}
            >
              Find travelers
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{
        background: "white",
        borderBottom: "1px solid #F3F4F6",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "60px",
        flexWrap: "wrap",
        filter: showPrompt ? "blur(8px)" : "none",
        transition: "filter 0.3s ease",
        pointerEvents: showPrompt ? "none" : "auto",
        userSelect: showPrompt ? "none" : "auto"
      }}>
        {[
          {
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            ), value: stats.activeTravelers.toString(), label: "Active Travelers"
          },
          {
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            ), value: "1", label: "Countries Covered"
          },
          {
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><path d="M15 6a1 1 0 0 0 0-2h-3l-3 9 2.5 2.5" /><path d="M9 15l-1-4h6l2 4" /></svg>
            ), value: stats.activeRoutes.toString(), label: "Biker Routes Shared"
          },
        ].map((stat) => (
          <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {stat.icon}
            <span style={{ fontWeight: "700", fontSize: "13px", color: "#111827" }}>{stat.value}</span>
            <span style={{ fontSize: "13px", color: "#6B7280" }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        background: "white",
        borderBottom: "1px solid #F3F4F6",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        overflowX: "auto",
        filter: showPrompt ? "blur(8px)" : "none",
        transition: "filter 0.3s ease",
        pointerEvents: showPrompt ? "none" : "auto",
        userSelect: showPrompt ? "none" : "auto"
      }}>
        {/* Filter label */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#9CA3AF", fontSize: "11px", fontWeight: "600", marginRight: "4px", whiteSpace: "nowrap" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
          FILTER BY:
        </div>

        {["Biking", "Travel Groups"].map((f) => (
          <button 
            key={f} 
            onClick={() => onFilterChange(f)}
            style={{
              padding: "5px 14px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: "500",
              border: activeFilter === f ? "none" : "1px solid #E5E7EB",
              background: activeFilter === f ? "#111827" : "white",
              color: activeFilter === f ? "white" : "#374151",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}>
            {f}
          </button>
        ))}

        {/* World / India right side */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexShrink: 0 }}>

          <button style={{
            display: "flex", alignItems: "center", gap: "4px",
            padding: "5px 12px", borderRadius: "999px",
            fontSize: "12px", fontWeight: "500",
            border: "1px solid #FED7AA", background: "#FFF7ED", color: "#C2410C", cursor: "pointer"
          }}>
            🇮🇳 India
          </button>
        </div>
      </div>

    </section>
  );
}