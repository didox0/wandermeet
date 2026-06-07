import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../assets/styles.css";
import { API_URL } from "../config";

const API = API_URL;

function getStrength(val) {
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  return s;
}
const strengthColors = ["#e5e7eb", "#ef4444", "#f59e0b", "#10b981", "#2563eb"];

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (password !== confirm) return setErr("Passwords do not match!");
    if (getStrength(password) < 3)
      return setErr("Password too weak — use uppercase, numbers, and symbols.");

    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/reset-password/${token}`, { password });
      setSuccess(res.data.msg);
      setTimeout(() => navigate("/"), 2500);
    } catch (error) {
      setErr(error.response?.data?.msg || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div
        className="auth-shell"
        style={{ maxWidth: 460, minHeight: "auto", flexDirection: "column" }}
      >
        {/* Photo strip */}
        <div
          style={{
            background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)",
            padding: "28px 32px 22px",
            borderRadius: "20px 20px 0 0",
          }}
        >
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 4v4l3 2" />
              </svg>
            </div>
            <span className="auth-brand-name">Wander Meet</span>
          </div>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 22, marginTop: 16, marginBottom: 4 }}>
            Set a new password
          </h1>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
            Make it strong — you won't forget it this time! 🔐
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "28px 32px 32px", background: "#fff", borderRadius: "0 0 20px 20px" }}>
          {success ? (
            <div className="auth-success" style={{ fontSize: 14, padding: "14px 16px" }}>
              ✅ {success} Redirecting you to login…
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off">
              {err && <div className="auth-error">{err}</div>}

              <div className="auth-field">
                <label className="auth-label">New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className={`auth-input ${err ? "input-error" : ""}`}
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 18 }}
                  >
                    {showPass ? "👁️" : "🙈"}
                  </span>
                </div>
                <div className="auth-strength-bar">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="auth-strength-seg"
                      style={{ background: i <= strength ? strengthColors[strength] : "#e5e7eb" }}
                    />
                  ))}
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Confirm New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className={`auth-input ${err ? "input-error" : ""}`}
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <span
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 18 }}
                  >
                    {showPass ? "👁️" : "🙈"}
                  </span>
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Updating…" : "Reset Password"}
              </button>

              <p className="auth-switch">
                Remembered it?{" "}
                <span className="auth-switch-link" onClick={() => navigate("/")}>
                  Back to Login
                </span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
