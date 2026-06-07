import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showSignupPass, setShowSignupPass] = useState(false);

  // login
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // signup
  const [signupForm, setSignupForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [signupErr, setSignupErr] = useState("");
  const [signupOk, setSignupOk] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // ── Forgot password modal ───────────────────────────────────────────────
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotErr, setForgotErr] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const [forgotNotFound, setForgotNotFound] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotErr("");
    setForgotMsg("");
    setForgotNotFound(false);
    setForgotLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/forgot-password`, { email: forgotEmail });
      if (res.data.msg && res.data.msg.toLowerCase().includes("no account")) {
        setForgotNotFound(true);
      } else {
        setForgotMsg(res.data.msg);
      }
    } catch (err) {
      setForgotErr(err.response?.data?.msg || "Something went wrong. Try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotEmail("");
    setForgotMsg("");
    setForgotErr("");
    setForgotNotFound(false);
  };


  const strength = getStrength(signupForm.password);
  const isSignup = mode === "signup";
  // client/src/pages/AuthPage.js

  // 1. Logic for the Signup Button
  // 1. Logic for the Signup Button
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupErr(""); // Clear previous errors

    const { username, email, password, confirm } = signupForm; // Extract data

    // GATE 1: Check if Password and Confirm match
    if (password !== confirm) {
      return setSignupErr("Passwords do not match!"); // Stops the code here
    }

    // GATE 2: Use your getStrength Lex to enforce rules
    // If strength is less than 3, we stop the traveler
    if (getStrength(password) < 3) {
      return setSignupErr(
        "Password is too weak! Use Caps, Numbers, and Symbols."
      ); // Stops the code here
    }

    setSignupLoading(true);
    try {
      // Only if it passes both Gates above, it reaches this part:
      const res = await axios.post(`${API}/api/auth/register`, {
        username,
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      if (res.data.username) {
        localStorage.setItem("username", res.data.username);
      } else {
        localStorage.setItem("username", username);
      }
      window.dispatchEvent(new Event("localStorageChanged"));
      navigate("/discover");
    } catch (err) {
      setSignupErr(err.response?.data?.msg || "Signup failed. Try again!");
    } finally {
      setSignupLoading(false);
    }
  };

  // 2. Logic for the Login Button
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErr(""); // Clear previous errors
    try {
      const { email, password } = loginForm;
      // Sends data to the /login gate
      const res = await axios.post(`${API}/api/auth/login`, {
        email,
        password,
      });

      // Store the "Golden Ticket"
      localStorage.setItem("token", res.data.token);
      if (res.data.username) {
        localStorage.setItem("username", res.data.username);
      }
      window.dispatchEvent(new Event("localStorageChanged"));

      navigate("/discover");
    } catch (err) {
      // Show red error in input box instead of alert
      setLoginErr(err.response?.data?.msg || "Invalid Email or Password");
    }
  };

  const photoPanel = (
    <div className={`auth-photo ${isSignup ? "order-last" : "order-first"}`}>
      <div className="auth-photo-overlay" />
      <div className="auth-photo-content">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4v4l3 2" />
            </svg>
          </div>
          <span className="auth-brand-name">Wander Meet</span>
        </div>
        <div>
          <h1 className="auth-photo-title">
            {isSignup ? (
              <>
                Join the
                <br />
                Community
                <br />
                Today.
              </>
            ) : (
              <>
                Welcome
                <br />
                Back,
                <br />
                Explorer.
              </>
            )}
          </h1>
          <p className="auth-photo-sub">
            {isSignup
              ? "Create your account and find your next travel partner."
              : "Sign in to reconnect with your travel community worldwide."}
          </p>
        </div>
        <div className="auth-trust-row">
          <span className="auth-trust-item">✦ Verified Profiles</span>
          <span className="auth-trust-item">◎ Safe Community</span>
        </div>
      </div>
    </div>
  );

  const loginPanel = (
    <div
      className={`auth-form-panel ${isSignup ? "slide-out-left" : "slide-in"}`}
    >
      <h2 className="auth-form-heading">Sign In</h2>
      <p className="auth-form-sub">Enter your credentials to continue.</p>

      <form onSubmit={handleLogin} autoComplete="off">
        <div className="auth-field">
          <label className="auth-label">Email address</label>
          <input
            className={`auth-input ${loginErr ? "input-error" : ""}`}
            type="email"
            placeholder="you@example.com"
            value={loginForm.email}
            onChange={(e) =>
              setLoginForm({ ...loginForm, email: e.target.value })
            }
            required
          />
        </div>
        <div className="auth-field">
          <div className="auth-field-row">
            <label className="auth-label">Password</label>
            <span className="auth-forgot" onClick={() => setShowForgot(true)}>Forgot password?</span>
          </div>
          {/* INSERT WRAPPER HERE */}
          <div style={{ position: 'relative' }}>
            <input
              className={`auth-input ${loginErr ? "input-error" : ""}`}
              // TYPE SWITCHES HERE
              type={showLoginPass ? "text" : "password"}
              placeholder="••••••••"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
              required
            />
            {/* EYE ICON INSERTED HERE */}
            <span
              onClick={() => setShowLoginPass(!showLoginPass)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              {showLoginPass ? "👁️" : "🙈"}
            </span>
          </div>
          {loginErr && <span className="error-text">{loginErr}</span>}
        </div>
        <button type="submit" className="auth-btn" disabled={loginLoading}>
          {loginLoading ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <p className="auth-switch">
        Don't have an account?{" "}
        <span className="auth-switch-link" onClick={() => setMode("signup")}>
          Sign up for free
        </span>
      </p>
    </div>
  );

  const signupPanel = (
    <div
      className={`auth-form-panel ${isSignup ? "slide-in" : "slide-out-right"}`}
    >
      <h2 className="auth-form-heading">Create Account</h2>
      <p className="auth-form-sub">Join thousands of travelers worldwide.</p>

      <form onSubmit={handleSignup} autoComplete="off">
        <div className="auth-field">
          <label className="auth-label">Username</label>
          <input
            className="auth-input"
            type="text"
            placeholder="choose_a_username"
            value={signupForm.username}
            onChange={(e) =>
              setSignupForm({ ...signupForm, username: e.target.value })
            }
            required
          />
        </div>
        <div className="auth-field">
          <label className="auth-label">Email address</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={signupForm.email}
            onChange={(e) =>
              setSignupForm({ ...signupForm, email: e.target.value })
            }
            required
          />
        </div>
        <div className="auth-field">
          <label className="auth-label">Password</label>
          {/* WRAPPER FOR EYE ICON */}
          <div style={{ position: 'relative' }}>
            <input
              className={`auth-input ${signupErr ? "input-error" : ""}`}
              // TYPE TOGGLES HERE
              type={showSignupPass ? "text" : "password"}
              placeholder="••••••••"
              value={signupForm.password}
              onChange={(e) =>
                setSignupForm({ ...signupForm, password: e.target.value })
              }
              required
            />
            <span
              onClick={() => setShowSignupPass(!showSignupPass)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '18px' }}
            >
              {showSignupPass ? "👁️" : "🙈"}
            </span>
          </div>
          <div className="auth-strength-bar">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="auth-strength-seg"
                style={{
                  background:
                    i <= strength ? strengthColors[strength] : "#e5e7eb",
                }}
              />
            ))}
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-label">Confirm password</label>
          {/* WRAPPER FOR EYE ICON */}
          <div style={{ position: 'relative' }}>
            <input
              className={`auth-input ${signupErr ? "input-error" : ""}`}
              // TYPE TOGGLES HERE
              type={showSignupPass ? "text" : "password"}
              placeholder="••••••••"
              value={signupForm.confirm}
              onChange={(e) =>
                setSignupForm({ ...signupForm, confirm: e.target.value })
              }
              required
            />
            <span
              onClick={() => setShowSignupPass(!showSignupPass)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '18px' }}
            >
              {showSignupPass ? "👁️" : "🙈"}
            </span>
          </div>
          {signupErr && <span className="error-text">{signupErr}</span>}
        </div>
        <button type="submit" className="auth-btn" disabled={signupLoading}>
          {signupLoading ? "Creating account…" : "Create Account"}
        </button>
      </form>
      <p className="auth-switch">
        Already have an account?{" "}
        <span className="auth-switch-link" onClick={() => setMode("login")}>
          Sign in
        </span>
      </p>
    </div>
  );

  // ── Forgot password modal overlay ─────────────────────────────────────────
  const forgotModal = showForgot && (
    <div
      onClick={closeForgot}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, padding: "32px 28px",
          width: "100%", maxWidth: 400,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          animation: "fadeSlideUp 0.25s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: "#111", margin: 0 }}>Forgot password?</h2>
            <p style={{ fontSize: 13, color: "#666", marginTop: 4, marginBottom: 0 }}>
              Enter your email and we'll send a reset link.
            </p>
          </div>
          <button
            onClick={closeForgot}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}
          >✕</button>
        </div>

        {!forgotMsg && !forgotNotFound ? (
          <form onSubmit={handleForgot}>
            {forgotErr && <div className="auth-error">{forgotErr}</div>}
            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <input
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="auth-btn" disabled={forgotLoading} style={{ marginBottom: 0 }}>
              {forgotLoading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        ) : forgotMsg ? (
          <div className="auth-success" style={{ fontSize: 14, marginBottom: 0 }}>
            📧 {forgotMsg}
          </div>
        ) : (
          <div style={{ fontSize: 14, marginBottom: 0 }}>
            <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: "12px 16px", color: "#92400e" }}>
              ⚠️ No WanderMeet account found for <strong>{forgotEmail}</strong>.
              <br /><br />
              Try a different email, or create a new account
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return (
    <>
      {forgotModal}
      <div className="auth-page">
        <div className={`auth-shell ${isSignup ? "is-signup" : ""}`}>
          <div className="auth-forms-wrap">
            {loginPanel}
            {signupPanel}
          </div>
          {photoPanel}
        </div>
      </div>
    </>
  );
}
