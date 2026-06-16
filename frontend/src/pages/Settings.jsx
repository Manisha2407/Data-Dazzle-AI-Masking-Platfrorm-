import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import '../style/settings.css';
import authFetch from '../utils/authFetch';

const API = 'http://localhost:5000/api';

const ENTITY_LIST = [
  { key: 'CREDIT_CARD',   label: 'Credit Card' },
  { key: 'CRYPTO',        label: 'Crypto' },
  { key: 'DATE_TIME',     label: 'Date / Time' },
  { key: 'EMAIL_ADDRESS', label: 'Email' },
  { key: 'IP_ADDRESS',    label: 'IP Address' },
  { key: 'MAC_ADDRESS',   label: 'MAC Address' },
  { key: 'URL',           label: 'URL' },
  { key: 'LOCATION',      label: 'Location' },
  { key: 'PERSON',        label: 'Person' },
  { key: 'ORG',           label: 'Organization' },
  { key: 'AADHAAR',       label: 'Aadhaar' },
  { key: 'PAN',           label: 'PAN Card' },
  { key: 'PHONE_NUMBER',  label: 'Phone' },
  { key: 'BANK_ACCOUNT',  label: 'Bank Account' },
  { key: 'DOMAIN',        label: 'Domain' },
  { key: 'PINCODE',       label: 'PIN Code' },
  { key: 'IFSC_CODE',     label: 'IFSC Code' },
];

const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: 'Weak',   color: '#e53e3e' };
  if (score <= 2) return { score: 2, label: 'Fair',   color: '#ed8936' };
  if (score <= 3) return { score: 3, label: 'Good',   color: '#d69e2e' };
  if (score <= 4) return { score: 4, label: 'Strong', color: '#48bb78' };
  return { score: 5, label: 'Very Strong', color: '#38a169' };
};

const Toast = ({ msg, type, onClose }) => {
  if (!msg) return null;
  return (
    <div className={`settings-toast settings-toast-${type}`}>
      <span>{type === 'success' ? '✓' : '⚠'} {msg}</span>
      <button onClick={onClose}>✕</button>
    </div>
  );
};

const ConfirmModal = ({ title, message, confirmLabel, danger, onConfirm, onCancel, loading, children }) => (
  <div className="settings-modal-overlay" onClick={onCancel}>
    <div className="settings-modal" onClick={e => e.stopPropagation()}>
      <h3 className="settings-modal-title">{title}</h3>
      <p className="settings-modal-msg">{message}</p>
      {children}
      <div className="settings-modal-actions">
        <button className="settings-btn settings-btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
        <button className={`settings-btn ${danger ? 'settings-btn-danger' : 'settings-btn-primary'}`} onClick={onConfirm} disabled={loading}>
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const AccountSection = ({ showToast }) => {
  const [user, setUser] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${API}/settings`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUser(data.user);
        setNewUsername(data.user.username);
        setEmail(data.user.email);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('email', data.user.email);
      } catch (err) {
        showToast(err.message || 'Failed to load account info', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const handleSave = async () => {
    if (!newUsername.trim()) return showToast('Username cannot be empty', 'error');
    setSaving(true);
    try {
      const usernameRes = await authFetch(`${API}/settings/username`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      const usernameData = await usernameRes.json();
      if (!usernameRes.ok) throw new Error(usernameData.error);

      const emailRes = await authFetch(`${API}/settings/email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const emailData = await emailRes.json();
      if (!emailRes.ok) throw new Error(emailData.error);

      setUser(emailData.user);
      localStorage.setItem('username', emailData.user.username);
      localStorage.setItem('email', emailData.user.email);
      showToast('Account details saved successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-section"><p>Loading...</p></div>;

  const initials = (user?.username || 'User').slice(0, 2).toUpperCase();

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Account</h2>
        <p className="settings-section-sub">Manage your personal information</p>
      </div>

      <div className="settings-avatar-row">
        <div className="settings-avatar">{initials}</div>
        <div className="settings-avatar-info">
          <p className="settings-avatar-name">{user?.username || 'User'}</p>
          <p className="settings-avatar-hint">Your display name across the platform</p>
        </div>
      </div>

      <div className="settings-form">
        <div className="settings-field">
          <label className="settings-label">Username</label>
          <input
            className="settings-input"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            placeholder="Enter username"
            maxLength={30}
          />
          <p className="settings-field-hint">{newUsername.length}/30 characters</p>
        </div>

        <div className="settings-field">
          <label className="settings-label">Email Address</label>
          <input
            className="settings-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter email"
            type="email"
          />
          <p className="settings-field-hint">Used for account recovery and notifications</p>
        </div>

        <div className="settings-field">
          <label className="settings-label">Account Created</label>
          <input className="settings-input settings-input-readonly" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''} readOnly />
        </div>

        <button className="settings-btn settings-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const SecuritySection = ({ showToast }) => {
  const username = localStorage.getItem('username') || '';
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const strength = getPasswordStrength(newPw);

  const handleChangePassword = async () => {
    if (!currentPw) return showToast('Enter your current password', 'error');
    if (newPw.length < 8) return showToast('New password must be at least 8 characters', 'error');
    if (newPw !== confirmPw) return showToast('New passwords do not match', 'error');
    setSaving(true);
    try {
      const res = await authFetch(`${API}/settings/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showToast('Password changed successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return showToast('Password is required', 'error');
    setDeleting(true);
    try {
      const res = await authFetch(`${API}/settings/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.clear();
      navigate('/', { replace: true });
    } catch (err) {
      showToast(err.message || 'Failed to delete account', 'error');
      setDeleting(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Security</h2>
        <p className="settings-section-sub">Manage your password and account security</p>
      </div>

      <div className="settings-form">
        <div className="settings-subsection-title">Change Password</div>

        <div className="settings-field">
          <label className="settings-label">Current Password</label>
          <input className="settings-input" type={showPassword ? "text" : "password"} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" />
          <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
            {showPassword ? <FaEye />:<FaEyeSlash />}
          </button>
        </div>

        <div className="settings-field">
          <label className="settings-label">New Password</label>
          <input className="settings-input" type={showPassword ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Enter new password" />
          <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
            {showPassword ? <FaEye />:<FaEyeSlash />}
          </button>
          {newPw && (
            <div className="settings-strength">
              <div className="settings-strength-bar">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="settings-strength-seg" style={{ background: i <= strength.score ? strength.color : '#e2e8f0' }} />
                ))}
              </div>
              <span className="settings-strength-label" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
        </div>

        <div className="settings-field">
          <label className="settings-label">Confirm New Password</label>
          <input className="settings-input" type={showPassword ? "text" : "password"} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" />
          <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
            {showPassword ? <FaEye />:<FaEyeSlash />}
          </button>
          {confirmPw && newPw !== confirmPw && <p className="settings-field-error">Passwords do not match</p>}
        </div>

        <button className="settings-btn settings-btn-primary" onClick={handleChangePassword} disabled={saving}>
          {saving ? 'Changing...' : 'Change Password'}
        </button>
      </div>

      <div className="settings-danger-zone">
        <div className="settings-danger-header">
          <h3 className="settings-danger-title">Danger Zone</h3>
          <p className="settings-danger-sub">These actions are permanent and cannot be undone</p>
        </div>
        <div className="settings-danger-item">
          <div>
            <p className="settings-danger-item-title">Delete Account</p>
            <p className="settings-danger-item-sub">Permanently delete your account and all associated data</p>
          </div>
          <button className="settings-btn settings-btn-danger" onClick={() => setShowDeleteModal(true)}>
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Account"
          message="This will permanently delete your account, all documents, and entity data. Enter your current password to confirm."
          confirmLabel="Delete My Account"
          danger
          onConfirm={handleDeleteAccount}
          onCancel={() => { setShowDeleteModal(false); setDeletePassword(''); }}
          loading={deleting}
        >
          <input
            className="settings-input"
            style={{ margin: '0.75rem 0' }}
            type="password"
            value={deletePassword}
            onChange={e => setDeletePassword(e.target.value)}
            placeholder="Enter your current password"
          />
        </ConfirmModal>
      )}
    </div>
  );
};

const PreferencesSection = ({ showToast }) => {
  const [redactionMethod, setRedactionMethod] = useState('mask');
  const [confidence, setConfidence] = useState(70);
  const [entityTypes, setEntityTypes] = useState(() =>
    Object.fromEntries(ENTITY_LIST.map(e => [e.key, true]))
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${API}/settings/preferences`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setRedactionMethod(data.redactionMethod || 'mask');
        setConfidence(data.confidenceThreshold ?? 70);
        if (data.entityTypes) {
          const parsed = typeof data.entityTypes === 'string' ? JSON.parse(data.entityTypes) : data.entityTypes;
          setEntityTypes(prev => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        showToast(err.message || 'Failed to load preferences', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const allChecked = Object.values(entityTypes).every(Boolean);
  const checkedCount = Object.values(entityTypes).filter(Boolean).length;

  const handleSelectAll = () => {
    const next = !allChecked;
    setEntityTypes(Object.fromEntries(ENTITY_LIST.map(e => [e.key, next])));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`${API}/settings/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redactionMethod, confidenceThreshold: confidence, entityTypes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Preferences saved successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-section"><p>Loading...</p></div>;

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Preferences</h2>
        <p className="settings-section-sub">Set your default redaction settings</p>
      </div>

      <div className="settings-form">
        <div className="settings-subsection-title">Default Redaction Method</div>
        <div className="settings-radio-group">
          {[
            { value: 'mask',   label: 'Mask',   desc: 'Replace with [ENTITY_TYPE]' },
            { value: 'hash',   label: 'Hash',   desc: 'Consistent pseudonyms' },
            { value: 'remove', label: 'Remove', desc: 'Delete completely' },
            { value: 'fake',   label: 'Fake',   desc: 'Replace with realistic data' },
          ].map(opt => (
            <label key={opt.value} className={`settings-radio-option ${redactionMethod === opt.value ? 'selected' : ''}`}>
              <input type="radio" name="pref_method" value={opt.value} checked={redactionMethod === opt.value} onChange={() => setRedactionMethod(opt.value)} />
              <div>
                <span className="settings-radio-label">{opt.label}</span>
                <span className="settings-radio-desc">{opt.desc}</span>
              </div>
            </label>
          ))}
        </div>

        <div className="settings-subsection-title" style={{ marginTop: '1.5rem' }}>Default Confidence Threshold</div>
        <div className="settings-field">
          <div className="settings-slider-row">
            <input type="range" min="50" max="100" value={confidence} onChange={e => setConfidence(parseInt(e.target.value))} className="settings-slider" />
            <span className="settings-slider-val">{confidence}%</span>
          </div>
          <p className="settings-field-hint">Minimum confidence score for an entity to be detected</p>
        </div>

        <div className="settings-subsection-title" style={{ marginTop: '1.5rem' }}>Default Entity Types</div>
        <label className="settings-select-all-row">
          <input type="checkbox" checked={allChecked} onChange={handleSelectAll} />
          <span className="settings-select-all-label">
            All Entity Types
            <span className="settings-select-all-count">({checkedCount}/{ENTITY_LIST.length} selected)</span>
          </span>
        </label>
        <div className="settings-entity-grid">
          {ENTITY_LIST.map(entity => (
            <label key={entity.key} className="settings-checkbox-option">
              <input type="checkbox" checked={entityTypes[entity.key]} onChange={() => setEntityTypes(prev => ({ ...prev, [entity.key]: !prev[entity.key] }))} />
              <span>{entity.label}</span>
            </label>
          ))}
        </div>

        <button className="settings-btn settings-btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: '1.5rem' }}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

const DataPrivacySection = ({ showToast }) => {
  const [showDeleteDocsModal, setShowDeleteDocsModal] = useState(false);
  const [deletingDocs, setDeletingDocs] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const res = await authFetch(`${API}/documents?page=1`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datadazzle-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data downloaded successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to download data', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAllDocs = async () => {
    setDeletingDocs(true);
    try {
      const res = await authFetch(`${API}/settings/documents`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('All documents deleted successfully', 'success');
      setShowDeleteDocsModal(false);
    } catch (err) {
      showToast(err.message || 'Failed to delete documents', 'error');
    } finally {
      setDeletingDocs(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Data & Privacy</h2>
        <p className="settings-section-sub">Control your data and privacy settings</p>
      </div>

      <div className="settings-form">
        <div className="settings-subsection-title">Your Data</div>

        <div className="settings-data-item">
          <div className="settings-data-item-info">
            <p className="settings-data-item-title">Download All My Data</p>
            <p className="settings-data-item-sub">Export all your documents and entity metadata as a JSON file</p>
          </div>
          <button className="settings-btn settings-btn-secondary" onClick={handleDownloadData} disabled={downloading}>
            {downloading ? 'Downloading...' : '⬇ Export Data'}
          </button>
        </div>

        <div className="settings-privacy-list">
          <div className="settings-subsection-title" style={{ marginBottom: '1rem' }}>Privacy Policy</div>
          <div className="settings-privacy-item"><span className="settings-check">✓</span><span>Original documents are automatically deleted after 24 hours</span></div>
          <div className="settings-privacy-item"><span className="settings-check">✓</span><span>Redacted files are stored securely and never shared</span></div>
          <div className="settings-privacy-item"><span className="settings-check">✓</span><span>Entity data is used only for redaction — never for training models</span></div>
          <div className="settings-privacy-item"><span className="settings-check">✓</span><span>All data transfers are encrypted in transit</span></div>
        </div>

        <div className="settings-danger-zone" style={{ marginTop: '1.5rem' }}>
          <div className="settings-danger-header">
            <h3 className="settings-danger-title">Danger Zone</h3>
            <p className="settings-danger-sub">These actions are permanent and cannot be undone</p>
          </div>
          <div className="settings-danger-item">
            <div>
              <p className="settings-danger-item-title">Delete All Documents</p>
              <p className="settings-danger-item-sub">Permanently delete all your documents and entity data. Your account will remain active.</p>
            </div>
            <button className="settings-btn settings-btn-danger" onClick={() => setShowDeleteDocsModal(true)}>
              Delete All
            </button>
          </div>
        </div>
      </div>

      {showDeleteDocsModal && (
        <ConfirmModal
          title="Delete All Documents"
          message="This will permanently delete all your uploaded documents, redacted files, and entity data. Your account will not be affected."
          confirmLabel="Delete All Documents"
          danger
          onConfirm={handleDeleteAllDocs}
          onCancel={() => setShowDeleteDocsModal(false)}
          loading={deletingDocs}
        />
      )}
    </div>
  );
};

const NAV_ITEMS = [
  { key: 'account', label: 'Account', icon: <img src="https://cdn-icons-png.flaticon.com/128/3177/3177440.png" className="nav-icon" />},
  { key: 'security', label: 'Security', icon: <img src="https://cdn-icons-png.flaticon.com/128/4744/4744315.png" className="nav-icon" />},
  { key: 'preferences', label: 'Preferences', icon: <img src="https://cdn-icons-png.flaticon.com/128/12673/12673696.png" className="nav-icon" />},
  { key: 'data', label: 'Data & Privacy', icon: <img src="https://cdn-icons-png.flaticon.com/128/9858/9858120.png" className="nav-icon" />},
];

const Settings = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState('account');
  const [toast, setToast] = useState({ msg: '', type: '' });

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <div className="settings-sidebar-top">
          <div className="settings-sidebar-logo">
            <img src="/final.png" alt="Logo" className="settings-sidebar-logo-img" />
            <span className="settings-sidebar-logo-text">Data Dazzle</span>
          </div>
          <p className="settings-sidebar-heading">Settings</p>
          <nav className="settings-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={`settings-nav-item ${active === item.key ? 'active' : ''}`}
                onClick={() => setActive(item.key)}
              >
                <span className="settings-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {active === item.key && <span className="settings-nav-indicator" />}
              </button>
            ))}
          </nav>
        </div>

        <button className="settings-back-btn" onClick={() => navigate('/dash')}>
          ← Back to Dashboard
        </button>
      </aside>

      <main className="settings-main">
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: '' })} />

        {active === 'account'     && <AccountSection showToast={showToast} />}
        {active === 'security'    && <SecuritySection showToast={showToast} />}
        {active === 'preferences' && <PreferencesSection showToast={showToast} />}
        {active === 'data'        && <DataPrivacySection showToast={showToast} />}
      </main>
    </div>
  );
};

export default Settings;