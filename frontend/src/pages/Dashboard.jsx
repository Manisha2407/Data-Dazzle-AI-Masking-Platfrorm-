import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Policy from '../components/Policy';
import { useRedact } from '../context/RedactContext';
import '../style/dash.css';
import authFetch from '../utils/authFetch';

const ENTITY_LIST = [
  { key: 'CREDIT_CARD',    label: 'Credit Card' },
  { key: 'CRYPTO',         label: 'Crypto' },
  { key: 'DATE_TIME',      label: 'Date / Time' },
  { key: 'EMAIL_ADDRESS',  label: 'Email' },
  { key: 'IP_ADDRESS',     label: 'IP Address' },
  { key: 'MAC_ADDRESS',    label: 'MAC Address' },
  { key: 'URL',            label: 'URL' },
  { key: 'LOCATION',       label: 'Location' },
  { key: 'PERSON',         label: 'Person' },
  { key: 'ORG',            label: 'Organization' },
  { key: 'AADHAAR',        label: 'Aadhaar' },
  { key: 'PAN',            label: 'PAN Card' },
  { key: 'PHONE_NUMBER',   label: 'Phone' },
  { key: 'BANK_ACCOUNT',   label: 'Bank Account' },
  { key: 'DOMAIN',         label: 'Domain' },
  { key: 'PINCODE',        label: 'PIN Code' },
  { key: 'IFSC_CODE',      label: 'IFSC Code' },
];

const ENTITY_COLORS = {
  PERSON: '#9f7aea', EMAIL_ADDRESS: '#4299e1', PHONE_NUMBER: '#48bb78',
  LOCATION: '#ed8936', ORG: '#667eea', AADHAAR: '#e53e3e', PAN: '#d69e2e',
  CREDIT_CARD: '#fc8181', BANK_ACCOUNT: '#38b2ac', IFSC_CODE: '#805ad5',
  PINCODE: '#ed64a6', DATE_TIME: '#718096', IP_ADDRESS: '#2b6cb0',
  MAC_ADDRESS: '#276749', URL: '#c05621', DOMAIN: '#b7791f', CRYPTO: '#f6ad55',
};

const ENTITY_LABELS = {
  PERSON: 'Person', EMAIL_ADDRESS: 'Email', PHONE_NUMBER: 'Phone',
  LOCATION: 'Location', ORG: 'Organization', AADHAAR: 'Aadhaar', PAN: 'PAN Card',
  CREDIT_CARD: 'Credit Card', BANK_ACCOUNT: 'Bank Account', IFSC_CODE: 'IFSC Code',
  PINCODE: 'PIN Code', DATE_TIME: 'Date/Time', IP_ADDRESS: 'IP Address',
  MAC_ADDRESS: 'MAC Address', URL: 'URL', DOMAIN: 'Domain', CRYPTO: 'Crypto',
};

const buildInitialEntityState = () => {
  const state = {};
  ENTITY_LIST.forEach(e => { state[e.key] = true; });
  return state;
};

const API = 'http://localhost:5000/api';


const formatTime = (iso) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { processDocument, isProcessing } = useRedact();
  const username = localStorage.getItem('username') || 'User';
  const avatarInitials = username.slice(0, 2).toUpperCase();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [uploadMethod, setUploadMethod] = useState(null);
  const [fileSizeError, setFileSizeError] = useState('');
  const [redactionMethod, setRedactionMethod] = useState('mask');
  const [isDragging, setIsDragging] = useState(false);
  const [entityTypes, setEntityTypes] = useState(buildInitialEntityState);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [submitMsg, setSubmitMsg] = useState('');
  const [prefsLoading, setPrefsLoading] = useState(true);

  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const uploadSectionRef = useRef(null);

  // Load user preferences from settings API
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await authFetch(`${API}/settings/preferences`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        if (data.redactionMethod) {
          setRedactionMethod(data.redactionMethod);
        }
        if (data.confidenceThreshold !== undefined && data.confidenceThreshold !== null) {
          setConfidenceThreshold(data.confidenceThreshold);
        }
        if (data.entityTypes) {
          const parsed = typeof data.entityTypes === 'string' 
            ? JSON.parse(data.entityTypes) 
            : data.entityTypes;
          setEntityTypes(prev => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
        // Fall back to defaults already set in state
      } finally {
        setPrefsLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [statsRes, usageRes, breakdownRes, docsRes] = await Promise.all([
        authFetch(`${API}/dash/stats`),
        authFetch(`${API}/dash/usage`),
        authFetch(`${API}/dash/entity-breakdown`),
        authFetch(`${API}/dash/recent-documents`),
      ]);
      const [statsData, usageData, breakdownData, docsData] = await Promise.all([
        statsRes.json(), usageRes.json(), breakdownRes.json(), docsRes.json(),
      ]);
      setStats(statsData);
      setUsage(usageData);
      setBreakdown(breakdownData);
      setRecentDocs(docsData.documents || []);
    } catch {
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    navigate('/', { replace: true });
  };

  const allChecked = Object.values(entityTypes).every(Boolean);
  const checkedCount = Object.values(entityTypes).filter(Boolean).length;

  const handleSelectAll = () => {
    const next = !allChecked;
    const updated = {};
    ENTITY_LIST.forEach(e => { updated[e.key] = next; });
    setEntityTypes(updated);
  };

  const handleEntityToggle = (key) => setEntityTypes(prev => ({ ...prev, [key]: !prev[key] }));

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setFileSizeError(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum limit of 10 MB`);
        setSelectedFile(null);
        setUploadMethod(null);
        e.target.value = '';
        return;
      }
      setFileSizeError('');
      setSelectedFile(file);
      setUploadMethod('file');
      setTextInput('');
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); if (uploadMethod !== 'text') setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadMethod !== 'text') {
      const file = e.dataTransfer.files[0];
      if (file) {
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          setFileSizeError(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum limit of 10MB`);
          setSelectedFile(null);
          setUploadMethod(null);
          return;
        }
        setFileSizeError('');
        setSelectedFile(file);
        setUploadMethod('file');
        setTextInput('');
      }
    }
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    if (value.length > 50000) return;
    setTextInput(value);
    if (value.trim().length > 0) { setUploadMethod('text'); setSelectedFile(null); }
    else setUploadMethod(null);
  };

  const handleProcessDocument = async () => {
    if (!uploadMethod || isProcessing) return;
    const captured = { uploadMethod, selectedFile, textInput, redactionMethod, confidenceThreshold, entityTypes: { ...entityTypes }, ENTITY_LIST };
    handleClearUpload();
    setSubmitMsg('Your document has been submitted. Results will appear when complete — large files may take a few minutes.');
    await processDocument(captured);
    setSubmitMsg('');
    fetchDashboardData();
  };

  const handleClearUpload = () => {
    setSelectedFile(null);
    setTextInput('');
    setUploadMethod(null);
    setSubmitMsg('');
  };

  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    handleClearUpload();
  };

  const buildConicGradient = () => {
    if (!breakdown?.breakdown?.length) return 'conic-gradient(#e2e8f0 0deg 360deg)';
    const total = breakdown.breakdown.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return 'conic-gradient(#e2e8f0 0deg 360deg)';
    let current = 0;
    const parts = breakdown.breakdown.map(item => {
      const deg = (item.count / total) * 360;
      const color = ENTITY_COLORS[item.entityType] || '#667eea';
      const from = current;
      current += deg;
      return `${color} ${from.toFixed(2)}deg ${current.toFixed(2)}deg`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  };

  const usagePercent = usage ? Math.round((usage.used / usage.limit) * 100) : 0;

  const downloadRedacted = (docId, filename) => {
    const token = localStorage.getItem('accessToken');
    authFetch(`${API}/documents/${docId}/download/redacted`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redacted-${filename}`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };
  const FILE_ICONS = { pdf: 'https://cdn-icons-png.flaticon.com/128/9496/9496432.png', 
    docx: 'https://cdn-icons-png.flaticon.com/128/10451/10451822.png', 
    txt: 'https://cdn-icons-png.flaticon.com/128/8243/8243060.png' };
  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="logo">
            <img src="/final.png" alt="Logo" className="dashboard-logo-img" />
            <span>Data Dazzle</span>
          </div>
          <div className="nav-links">
            <a href="#" className="nav-link active" onClick={(e)=>{
              if(window.location.pathname==="/dash"){
                e.preventDefault();
                window.location.reload();
              }}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/documents'); }}>Documents</a>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/search'); }}>Search</a>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate('/analytics'); }}>Analytics</a>
          </div>
        </div>
        <div className="navbar-right">
          <div className="user-menu" ref={dropdownRef}>
            <div className={`user-menu-trigger ${dropdownOpen ? 'active' : ''}`} onClick={() => setDropdownOpen(!dropdownOpen)}>
              <div className="user-avatar">{avatarInitials}</div>
              <span className="user-name">{username}</span>
              <span className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}>▼</span>
            </div>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">{avatarInitials}</div>
                  <div className="dropdown-user-info">
                    <span className="dropdown-username">{username}</span>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/settings');
                  }}
                >
                  <img src="https://cdn-icons-png.flaticon.com/128/3953/3953226.png" alt="settings" className="dropdown-item-icon"/>
                  <span>Settings</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item dropdown-item-logout" onClick={handleLogout}>
                  <img src="https://cdn-icons-png.flaticon.com/128/4400/4400828.png" alt="logout" className="dropdown-item-icon"/>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="main-content">
        <aside className="left-sidebar">
          <div className="usage-summary">
            <h3>Usage Summary</h3>
            <div className="usage-card">
              <div className="usage-label">
                Uploads This Hour: {loadingStats ? '—' : `${usage?.used ?? 0}/${usage?.limit ?? 10}`}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${usagePercent}%` }} />
              </div>
              <div className="usage-reset">
                {loadingStats ? 'Loading...' : `Resets in: ${usage?.resetsInMinutes ?? '—'} minutes`}
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{loadingStats ? '—' : (stats?.allTime?.totalDocuments ?? 0).toLocaleString()}</div>
                <div className="stat-label">Total Documents</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{loadingStats ? '—' : (stats?.allTime?.totalEntities ?? 0).toLocaleString()}</div>
                <div className="stat-label">Entities Redacted</div>
              </div>
            </div>
          </div>

          <div className="recent-documents">
            <h3>Recent Documents</h3>
            <div className="document-list">
              {loadingStats ? (
                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>Loading...</p>
              ) : recentDocs.length === 0 ? (
                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>No documents yet</p>
              ) : (
                recentDocs.map(doc => (
                  <div key={doc.id} className="document-card">
                    <div className="doc-icon">
                      <img src={FILE_ICONS[doc.fileType?.toLowerCase()] ||'https://cdn-icons-png.flaticon.com/128/8243/8243060.png'}
                        alt={doc.fileType} className="file-icon-img" />
                    </div>
                    <div className="doc-info">
                      <div className="doc-name">{doc.filename}</div>
                      <div className="doc-meta">{formatTime(doc.createdAt)} • {doc.totalEntities ?? 0} entities</div>
                      <div className="doc-status">✓ {doc.status}</div>
                    </div>
                    <div className="doc-actions">
                      <button className="btn-icon" title="Download redacted" onClick={() => downloadRedacted(doc.id, doc.filename)}>
                        <img src="https://cdn-icons-png.flaticon.com/512/11207/11207288.png" alt="download" className="icon-img"/>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="view-all-btn" onClick={(e) => {navigate('/documents'); setTimeout(() => window.scrollTo(0, 0), 0) }}>View All Documents →</button>
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <button className="action-btn" onClick={scrollToUpload}>
              + New Upload
            </button>
            <button className="action-btn" onClick={(e) => { e.preventDefault(); navigate('/analytics'); }}>
              <img src="https://cdn-icons-png.flaticon.com/128/2041/2041643.png" alt="analytics" className="action-btn-icon"/>
              View Analytics
            </button>
            <button className="action-btn" onClick={(e) => { e.preventDefault(); window.scrollTo(0, 0); navigate('/search'); }}>
              <img src="https://cdn-icons-png.flaticon.com/128/16799/16799322.png" alt="search" className="action-btn-icon"/>
              Search Documents
            </button>
          </div>
        </aside>

        <main className="center-section">
          <div className="welcome-header">
            <h1>Welcome, {username}!</h1>
            <p>Ready to redact some documents?</p>
          </div>

          <div className="upload-section" ref={uploadSectionRef}>
            <h2>UPLOAD DOCUMENT</h2>
            <div
              className={`dropzone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''} ${uploadMethod === 'text' ? 'disabled' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadMethod === 'text' ? (
                <div className="disabled-message">
                  <p>📝 Text input mode active</p>
                  <p className="disabled-hint">Clear text below to upload a file instead</p>
                </div>
              ) : selectedFile ? (
                <div className="file-selected">
                  <div className="file-icon">📄</div>
                  <div className="file-details">
                    <div className="file-name">{selectedFile.name}</div>
                    <div className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</div>
                  </div>
                  <button className="remove-file" onClick={handleClearUpload}>✕</button>
                </div>
              ) : (
                <>
                  <div className="dropzone-icon">🗎</div>
                  <p className="dropzone-text">Drag & Drop your file here</p>
                  <p className="dropzone-or">or</p>
                  <label className="browse-btn">
                    Browse Files
                    <input type="file" onChange={handleFileSelect} accept=".pdf,.docx,.txt" style={{ display: 'none' }} disabled={uploadMethod === 'text'} />
                  </label>
                  <p className="dropzone-info">Supported: PDF, DOCX, TXT • Maximum size: 10 MB</p>
                </>
              )}
            </div>

            {fileSizeError && (
              <div className="file-size-error">
                <span className="error-icon">⚠️</span>
                <span>{fileSizeError}</span>
              </div>
            )}

            <div className="text-input-section">
              <h3>OR</h3>
              <h2>PASTE TEXT DIRECTLY</h2>
              {uploadMethod === 'file' ? (
                <div className="text-disabled-message">
                  <p>📄 File upload mode active</p>
                  <p className="disabled-hint">Remove the file above to paste text instead</p>
                </div>
              ) : (
                <>
                  <textarea
                    className="text-input"
                    placeholder="Paste your text here..."
                    value={textInput}
                    onChange={handleTextChange}
                    rows="6"
                    disabled={uploadMethod === 'file'}
                  />
                  <div className="char-count">Character count: {textInput.length} / 50,000</div>
                </>
              )}
            </div>
          </div>

          <div className="options-section">
            <h2>REDACTION OPTIONS</h2>
            {prefsLoading && (
              <div className="prefs-loading" style={{ marginBottom: '1rem', color: '#718096', fontSize: '0.9rem' }}>
                ⏳ Loading your preferences...
              </div>
            )}
            <div className="option-group">
              <label className="option-label">Redaction Method:</label>
              <div className="radio-group">
                {[
                  { value: 'mask',   label: 'Mask - Replace with [REDACTED]',    tip: 'Replaces sensitive data with [REDACTED] placeholder' },
                  { value: 'hash',   label: 'Hash - Consistent pseudonyms',       tip: 'Same entity gets same hash value' },
                  { value: 'remove', label: 'Remove - Delete completely',         tip: 'Removes sensitive data entirely' },
                  { value: 'fake',   label: 'Fake - Replace with realistic data', tip: 'Generates realistic fake data' },
                ].map(opt => (
                  <label key={opt.value} className={`radio-option ${redactionMethod === opt.value ? 'selected' : ''}`}>
                    <input type="radio" name="redactionMethod" value={opt.value} checked={redactionMethod === opt.value} onChange={(e) => setRedactionMethod(e.target.value)} />
                    <span className="radio-text">{opt.label}<span className="info-icon" title={opt.tip}>ℹ️</span></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="option-group">
              <label className="option-label">Entity Types to Detect:</label>
              <label className="select-all-row">
                <input type="checkbox" checked={allChecked} onChange={handleSelectAll} />
                <span className="select-all-label">
                  All Entity Types
                  <span className="select-all-count">({checkedCount}/{ENTITY_LIST.length} selected)</span>
                </span>
              </label>
              <div className="checkbox-group-grid">
                {ENTITY_LIST.map(entity => (
                  <label key={entity.key} className="checkbox-option">
                    <input type="checkbox" checked={entityTypes[entity.key]} onChange={() => handleEntityToggle(entity.key)} />
                    <span>{entity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="advanced-toggle">
              <button className="toggle-btn" onClick={() => setShowAdvanced(!showAdvanced)}>
                Advanced Options {showAdvanced ? '▼' : '▶'}
              </button>
            </div>

            {showAdvanced && (
              <div className="advanced-options">
                <div className="slider-group">
                  <label className="slider-label">Confidence Threshold: {confidenceThreshold}%</label>
                  <input type="range" min="50" max="100" value={confidenceThreshold} onChange={(e) => setConfidenceThreshold(e.target.value)} className="slider" />
                </div>
                {/* <label className="checkbox-option"><input type="checkbox" /><span>Auto-download result</span></label> */}
                <label className="checkbox-option"><input type="checkbox" /><span>Preserve document formatting</span></label>
              </div>
            )}
          </div>

          <div className="action-button-container">
            <button className="process-btn" onClick={handleProcessDocument} disabled={!uploadMethod || isProcessing}>
              {isProcessing ? 'Processing...' : 'Process Document'}
            </button>
            {!uploadMethod && !submitMsg && <p className="btn-hint">(Upload a file or paste text to enable)</p>}
            {submitMsg && <p className="submit-msg">{submitMsg}</p>}
          </div>
        </main>

        <aside className="right-sidebar">
          <div className="stats-section">
            <h3>YOUR STATISTICS</h3>
            <div className="stats-card">
              <h4>All Time:</h4>
              <div className="stats-row">
                <span className="stats-label">Total Documents:</span>
                <span className="stats-value">{loadingStats ? '—' : (stats?.allTime?.totalDocuments ?? 0).toLocaleString()}</span>
              </div>
              <div className="stats-row">
                <span className="stats-label">Total Entities:</span>
                <span className="stats-value">{loadingStats ? '—' : (stats?.allTime?.totalEntities ?? 0).toLocaleString()}</span>
              </div>
              <div className="stats-row">
                <span className="stats-label">Avg. Confidence:</span>
                <span className="stats-value">{loadingStats ? '—' : `${stats?.allTime?.avgConfidence ?? 0}%`}</span>
              </div>
              <div className="stats-row">
                <span className="stats-label">Processing Time:</span>
                <span className="stats-value">{loadingStats ? '—' : `${stats?.allTime?.avgProcessingTime ?? '0.0'}s`}</span>
              </div>
            </div>
            <div className="stats-card">
              <h4>This Week:</h4>
              <div className="stats-row">
                <span className="stats-label">Documents:</span>
                <span className="stats-value">{loadingStats ? '—' : (stats?.thisWeek?.totalDocuments ?? 0)}</span>
              </div>
              <div className="stats-row">
                <span className="stats-label">Entities:</span>
                <span className="stats-value">{loadingStats ? '—' : (stats?.thisWeek?.totalEntities ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="entity-breakdown">
            <h3>ENTITY BREAKDOWN</h3>
            <div className="pie-chart-placeholder">
              <div className="chart-circle" style={{ background: buildConicGradient() }} />
            </div>
            <div className="entity-list">
              {loadingStats ? (
                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>Loading...</p>
              ) : !breakdown?.breakdown?.length ? (
                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>No data yet</p>
              ) : (
                <div className="entity-list-grid">
                  {breakdown.breakdown.map(item => (
                    <div key={item.entityType} className="entity-item">
                      <span className="entity-icon" style={{ color: ENTITY_COLORS[item.entityType] || '#667eea' }}>●</span>
                      <span className="entity-label">{ENTITY_LABELS[item.entityType] || item.entityType}:</span>
                      <span className="entity-value">{item.count.toLocaleString()} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="tips-section">
            <h3>QUICK TIPS</h3>
            <div className="tip-card">
              <div className="tip-icon"></div>
              <div className="tip-content">
                <strong>Tip of the day:</strong>
                <p>Use HASH method for research to track same entities while protecting privacy!</p>
              </div>
            </div>
          </div>

          <div className="security-section">
            <h3>PRIVACY & SECURITY</h3>
            <div className="security-list">
              <div className="security-item"><span className="check-icon">✓</span><span>Original documents deleted automatically after 24h</span></div>
              <div className="security-item"><span className="check-icon">✓</span><span>Redacted versions kept securely</span></div>
              <div className="security-item"><span className="check-icon">✓</span><span>Rate limiting: 10/hour protects your quota</span></div>
              <div className="security-timer">{loadingStats ? 'Loading...' : `Next reset: ${usage?.resetsInMinutes ?? '—'} min`}</div>
              <button className="privacy-link" onClick={() => setPrivacyModalOpen(true)}>View Privacy Policy</button>
            </div>
          </div>
        </aside>
      </div>

      <Policy isOpen={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} />
    </div>
  );
};

export default Dashboard;