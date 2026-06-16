import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../style/login.css";

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = "http://localhost:5000/api";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback("");

    if (!identifier || !password) {
      setFeedbackType("error");
      setFeedback("Please enter your username/email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      if (response.ok) {
      const data = await response.json();

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("username", data.username);

      setFeedbackType("success");
      setFeedback("Login successful! Redirecting to dashboard...");

      setIdentifier("");
      setPassword("");

      setTimeout(() => {
        navigate("/dash");
      }, 1000);
    } else {
        const errorData = await response.json();
        setFeedbackType("error");
        if (errorData.message) setFeedback(errorData.message);
        else setFeedback("Invalid username/email or password.");
      }
    } catch (error) {
      setFeedbackType("error");
      setFeedback("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      <div className="auth-wrapper">

        {/* Left Panel */}
        <div className="auth-left">
          <div className="brand">
            <div className="brand-icon" onClick={() => navigate("/")}>
              <img src="/final.png" alt="Logo" />
            </div>
            <h1 className="brand-name">Data Dazzle</h1>
          </div>

          <div className="auth-left-content">
            <h2 className="auth-tagline">
              Protect your <span className="highlight">sensitive data</span>{" "}
              with AI-powered precision
            </h2>
            <p className="auth-description">
              Automatically detect and redact PII from your documents using
              advanced NLP models. Fast, secure, and reliable.
            </p>
            <div className="feature-list">
              <div className="feature-item">
                <img src="https://cdn-icons-png.flaticon.com/128/5532/5532931.png" alt="fast" className="feature-icon"/>
                <span>Real-time AI processing</span>
              </div>

              <div className="feature-item">
                <img src="https://cdn-icons-png.flaticon.com/128/2592/2592317.png" alt="security" className="feature-icon"/>
                <span>Enterprise-grade security</span>
              </div>

              <div className="feature-item">
                <img src="https://cdn-icons-png.flaticon.com/128/1358/1358574.png" alt="file" className="feature-icon" />
                <span>PDF, DOCX, TXT support</span>
              </div>

              <div className="feature-item">
                <img src="https://cdn-icons-png.flaticon.com/128/16799/16799322.png" alt="search" className="feature-icon"/>
                <span>Smart entity detection</span>
              </div>
            </div>
          </div>

          <div className="auth-left-footer">
            <div className="stat-pill">
              <span className="stat-num">NLP</span>
              <span className="stat-text">Powered Detection</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">24h</span>
              <span className="stat-text">Auto Data Deletion</span>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2 className="form-title">Welcome back</h2>
              <p className="form-subtitle">Sign in to your account</p>
            </div>

            {feedback && (
              <div className={`alert alert-${feedbackType}`}>
                <span className="alert-icon">
                  {feedbackType === "success" ? "✓" : "⚠️"}
                </span>
                <span>{feedback}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>

            <div className="form-group">
            <label className="form-label" htmlFor="identifier">
              Username or Email
            </label>
            <div className="input-wrapper">
              <img src="https://cdn-icons-png.flaticon.com/128/1077/1077114.png" alt="user" className="input-icon"/>
              <input
                id="identifier"
                type="text"
                className="form-input"
                placeholder="Enter username or email"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setFeedback(""); }}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-wrapper">
              <img src="https://cdn-icons-png.flaticon.com/128/807/807241.png" alt="password" className="input-icon"/>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFeedback(""); }}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
          </div>

              <div className="form-meta">
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>

              <button
                type="submit"
                className={`submit-btn ${isLoading ? "loading" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="btn-loading">
                    <span className="spinner" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In →"
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>Don't have an account?</span>
            </div>

            <button
              className="switch-btn"
              onClick={() => navigate("/signup")}
              disabled={isLoading}
            >
              Create Account
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
