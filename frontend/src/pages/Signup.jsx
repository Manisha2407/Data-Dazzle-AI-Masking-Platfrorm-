import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../style/signup.css";

const Signup = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = "http://localhost:5000/api";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback("");

    if (!username || !email || !password) {
      setFeedbackType("error");
      setFeedback("Please fill in all required fields.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setFeedbackType("error");
      setFeedback("Please enter a valid email address.");
      return;
    }

    if (password.length < 4) {
      setFeedbackType("error");
      setFeedback("Password must be at least 4 characters.");
      return;
    }

    setIsLoading(true);

    const userData = { username, email, password };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Registration successful:", data);

        setFeedbackType("success");
        setFeedback("Account created! Redirecting to login...");

        setUsername("");
        setEmail("");
        setPassword("");

        setTimeout(() => {
          navigate("/login");
        }, 1000);
      } else {
        const errorData = await response.json();
        // console.error("Registration failed:", errorData);
        console.log("error:", errorData);
        setFeedbackType("error");

        if (errorData.message)       setFeedback(errorData.message);
        else if (errorData.username) setFeedback(`Username: ${errorData.username[0]}`);
        else if (errorData.email)    setFeedback(`Email: ${errorData.email[0]}`);
        else if (errorData.password) setFeedback(`Password: ${errorData.password[0]}`);
        else                         setFeedback("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Network error:", error);
      setFeedbackType("error");
      setFeedback("Network error. Please check your connection or server status.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page signup-page">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      <div className="auth-wrapper signup-wrapper">

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
              Start protecting your{" "}
              <span className="highlight">documents</span> today
            </h2>
            <p className="auth-description">
              Join professionals who use Data Dazzle to handle sensitive data
              securely. Sign up free, no credit card required.
            </p>

            <div className="steps-list">
              <div className="step-item">
                <div className="step-num">1</div>
                <div className="step-text">
                  <strong>Create your account</strong>
                  <span>Free to start, no credit card required</span>
                </div>
              </div>
              <div className="step-item">
                <div className="step-num">2</div>
                <div className="step-text">
                  <strong>Upload your documents</strong>
                  <span>PDF, DOCX, or plain text files</span>
                </div>
              </div>
              <div className="step-item">
                <div className="step-num">3</div>
                <div className="step-text">
                  <strong>Get redacted results</strong>
                  <span>AI-powered PII detection in seconds</span>
                </div>
              </div>
            </div>
          </div>

          <div className="trust-badges">
            <div className="trust-item">
              <img src="https://cdn-icons-png.flaticon.com/128/1163/1163372.png" alt="encryption" className="trust-icon"/>
              End-to-end encryption
            </div>

            <div className="trust-item">
              <img src="https://cdn-icons-png.flaticon.com/128/6861/6861362.png" alt="delete" className="trust-icon"/>
              Auto-delete originals after 24h
            </div>

            <div className="trust-item">
              <img src="https://cdn-icons-png.flaticon.com/128/5532/5532931.png" alt="speed" className="trust-icon"/>
              10 free uploads per hour
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2 className="form-title">Create account</h2>
              <p className="form-subtitle">Start your free account today</p>
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
                <label className="form-label" htmlFor="username">
                  Username
                </label>
                <div className="input-wrapper">
                  <img src="https://cdn-icons-png.flaticon.com/128/17433/17433872.png" alt="username" className="input-icon"/>
                  <input
                    id="username"
                    type="text"
                    className="form-input"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setFeedback(""); }}
                    autoComplete="username"
                    disabled={isLoading}
                  />
                  {username.length >= 3 && (
                    <span className="input-valid">✓</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <img src="https://cdn-icons-png.flaticon.com/128/18154/18154191.png" alt="email" className="input-icon"/>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFeedback(""); }}
                    autoComplete="email"
                    disabled={isLoading}
                  />
                  {email && /\S+@\S+\.\S+/.test(email) && (
                    <span className="input-valid">✓</span>
                  )}
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
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFeedback(""); }}
                    autoComplete="new-password"
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

              <button
                type="submit"
                className={`submit-btn ${isLoading ? "loading" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="btn-loading">
                    <span className="spinner" />
                    Creating account...
                  </span>
                ) : (
                  "Create Account →"
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>Already have an account?</span>
            </div>

            <button
              className="switch-btn"
              onClick={() => navigate("/login")}
              disabled={isLoading}
            >
              Sign In Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
