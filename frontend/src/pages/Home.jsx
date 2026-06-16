import { useNavigate } from "react-router-dom";
import "../style/home.css";

export default function Home() {

  const navigate = useNavigate(); 

  const handleScroll = (e) => {
    e.preventDefault();
    const id = e.currentTarget.getAttribute("href").slice(1);
    const element = document.getElementById(id);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="nav">
        <div className="nav-logo" onClick={() => window.location.reload()} style={{ cursor: "pointer" }}>
          <img src="/final.png" alt="Logo" className="nav-logo-img"
        />
          Data<span>Dazzle</span>
        </div>
        <ul className="nav-links">
          <li><a href="#features" onClick={handleScroll}>Features</a></li>
          <li><a href="#security" onClick={handleScroll}>Security</a></li>
          <li><a href="#contact" onClick={handleScroll}>Contact</a></li>
        </ul>

        <div className="nav-actions">
          <button 
            className="btn-outline"
            onClick={() => navigate("/login")} 
          >
            Log in
          </button>

          <button 
            className="btn-primary"
            onClick={() => navigate("/signup")}  
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-tag">AI-POWERED DATA PROTECTION</span>

          <h1>
            Secure Sensitive Data
            <span> Without Breaking Your Pipelines</span>
          </h1>

          <p>
            Data-Dazzle uses AI to detect, classify and mask sensitive data
            across databases, files and real-time systems.
          </p>

          <div className="hero-actions">
            <button 
              className="btn-primary"
              onClick={() => navigate("/signup")} 
            >
              Create Account
            </button>

            <button className="btn-outline" onClick={() => navigate("/login")} >
              Sign in
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="ai-card">
            <div className="ai-line">john.doe@email.com → ██████</div>
            <div className="ai-line">4111-2222-3333-4444 → ****-****-****-4444</div>
            <div className="ai-line">SSN → ███-██-████</div>
            <div className="ai-glow" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="features">
        <h2>Built for Modern Data Teams</h2>

        <div className="feature-grid">
          <div className="feature-card">
            <h3>AI Data Discovery</h3>
            <p>Automatically find sensitive information everywhere.</p>
          </div>

          <div className="feature-card">
            <h3>Smart Masking</h3>
            <p>Mask data while preserving format and usability.</p>
          </div>

          <div className="feature-card">
            <h3>Real-Time Protection</h3>
            <p>Protect streams and APIs instantly.</p>
          </div>

          <div className="feature-card">
            <h3>Compliance Ready</h3>
            <p>Audit logs and regulatory coverage built-in.</p>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="security">
        <div className="security-wrap">
          <div className="security-text">
            <h2>Enterprise-Grade Security</h2>
            <p>
              Runs inside your infrastructure with zero-trust architecture.
              Encryption, access control and monitoring included.
            </p>

            <div className="security-points">
              <span>End-to-End Encryption</span>
              <span>Role Based Access</span>
              <span>Audit Trails</span>
            </div>
          </div>

          <div className="security-image">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3064/3064197.png"
              alt="security"
            />
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="contact">
        <h2>Contact Us</h2>
        <p>Have questions? Our team would love to help.</p>

        <form className="contact-form">
          <input type="text" placeholder="Full Name" required />
          <input type="email" placeholder="Email Address" required />
          <input type="text" placeholder="Company" />
          <textarea placeholder="Your Message" rows="5" required />
          <button className="btn-primary">Send Message</button>
        </form>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        © 2025 Data-Dazzle. All rights reserved.
      </footer>
    </>
  );
}
