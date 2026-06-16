import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/doc.css';
import DocumentViewer from '../components/DocumentViewer';
import authFetch from '../utils/authFetch';

const API = 'http://localhost:5000/api';

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

const FILE_ICONS = { pdf: 'https://cdn-icons-png.flaticon.com/128/9496/9496432.png', 
    docx: 'https://cdn-icons-png.flaticon.com/128/10451/10451822.png', 
    txt: 'https://cdn-icons-png.flaticon.com/128/8243/8243060.png' };

const formatTime = (iso) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatMs = (ms) => {
  if (!ms) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
};

const downloadFile = async (docId, type, filename) => {
  const token = localStorage.getItem('accessToken');
  const res = await authFetch(`${API}/documents/${docId}/download/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = type === 'redacted' ? `redacted-${filename}` : filename;
  a.click();
  URL.revokeObjectURL(url);
};

const DocDetailModal = ({ doc, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${API}/documents/${doc.id}`)
      .then(r => r.json())
      .then(data => { setDetail(data.document); setLoading(false); })
      .catch(() => setLoading(false));
  }, [doc.id]);

  const entityCounts = detail?.entityCounts || doc.entityCounts || {};
  const topEntities = Object.entries(entityCounts).sort(([, a], [, b]) => b - a);

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={e => e.stopPropagation()}>
        <div className="doc-modal-header">
          <div className="doc-modal-title-row">
            <span className="doc-modal-icon">
               <img src= {FILE_ICONS[doc.fileType] || 'https://cdn-icons-png.flaticon.com/128/8243/8243060.png'}
               alt={doc.fileType}
               className='file-icon-img' />
            </span>
            <div>
              <h2 className="doc-modal-title">{doc.filename}</h2>
              <p className="doc-modal-sub">{formatTime(doc.createdAt)} · {doc.redactionMethod?.toUpperCase()} method</p>
            </div>
          </div>
          <button className="doc-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="doc-modal-stats">
          <div className="doc-modal-stat">
            <span className="doc-modal-stat-val">{doc.totalEntities?.toLocaleString() ?? '—'}</span>
            <span className="doc-modal-stat-label">Entities</span>
          </div>
          <div className="doc-modal-stat-div" />
          <div className="doc-modal-stat">
            <span className="doc-modal-stat-val">{formatMs(doc.processingTimeMs)}</span>
            <span className="doc-modal-stat-label">Processing</span>
          </div>
          <div className="doc-modal-stat-div" />
          <div className="doc-modal-stat">
            <span className="doc-modal-stat-val">{doc.fileType?.toUpperCase() ?? '—'}</span>
            <span className="doc-modal-stat-label">Format</span>
          </div>
          <div className="doc-modal-stat-div" />
          <div className="doc-modal-stat">
            <span className="doc-modal-stat-val" style={{ color: doc.originalDeleted ? '#e53e3e' : '#48bb78', fontSize: '0.85rem' }}>
              {doc.originalDeleted ? 'Deleted' : 'Available'}
            </span>
            <span className="doc-modal-stat-label">Original</span>
          </div>
        </div>

        {loading ? (
          <div className="doc-modal-loading">Loading entity details...</div>
        ) : topEntities.length > 0 ? (
          <div className="doc-modal-entities">
            <p className="doc-modal-section-label">Entity Breakdown</p>
            <div className="doc-modal-entity-grid">
              {topEntities.map(([type, count]) => (
                <div key={type} className="doc-modal-entity-row">
                  <span className="doc-modal-entity-dot" style={{ background: ENTITY_COLORS[type] || '#667eea' }} />
                  <span className="doc-modal-entity-label">{ENTITY_LABELS[type] || type}</span>
                  <span className="doc-modal-entity-count">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="doc-modal-loading">No entity data available.</p>
        )}

        <div className="doc-modal-actions">
          {!doc.originalDeleted && (
            <button className="doc-modal-btn doc-modal-btn-secondary" onClick={() => downloadFile(doc.id, 'original', doc.filename)}>
              ⬇ Original
            </button>
          )}
          <button className="doc-modal-btn doc-modal-btn-primary" onClick={() => downloadFile(doc.id, 'redacted', doc.filename)}>
            ⬇ Redacted
          </button>
        </div>
      </div>
    </div>
  );
};

const DocCard = ({ doc, onView, onDelete }) => {
  const [viewerDoc, setViewerDoc] = useState(null);
  const [viewerEntities, setViewerEntities] = useState([]);

  const handleOpenViewer = async (doc) => {
    try {
      const token = localStorage.getItem('accessToken');

      const res = await authFetch(
        `http://localhost:5000/api/documents/${doc.id}/viewer`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      console.log("FULL DOCUMENT RESPONSE:", data);
      console.log("DOCUMENT OBJECT:", data.document);
      console.log("REDACTED TEXT:", data.document?.redactedText);
      console.log("REDACTED TEXT SNAKE:", data.document?.redacted_text);

      setViewerDoc({
        ...doc,
        redactedText: data.document?.redactedText,
      });

      setViewerEntities(data.document?.entities || []);
    } catch (err) {
      console.error(err);
    }
  };

  const entityCounts = doc.entityCounts || {};

  const topEntity = Object.entries(entityCounts).sort(
    ([, a], [, b]) => b - a
  )[0];

  return (
    <>
      <div className="doc-card">
        <div className="doc-card-top">
          <div className="doc-card-icon-wrap">
            <span className="doc-card-icon">
              <img
                src={
                  FILE_ICONS[doc.fileType] ||
                  'https://cdn-icons-png.flaticon.com/128/8243/8243060.png'
                }
                alt={doc.fileType}
                className="file-icon-img"
              />
            </span>

            <span
              className={`doc-card-type-badge doc-card-type-${doc.fileType}`}
            >
              {doc.fileType?.toUpperCase()}
            </span>
          </div>

          <div className="doc-card-actions-top">
            <button
              className="doc-card-btn"
              title="View document"
              onClick={() => handleOpenViewer(doc)}
            >
              <img
                src="https://cdn-icons-png.flaticon.com/128/159/159604.png"
                alt="view document"
                className="doc-icon-img"
              />
            </button>

            <button
              className="doc-card-btn"
              title="View details"
              onClick={() => onView(doc)}
            >
              <img
                src="https://cdn-icons-png.flaticon.com/128/2567/2567943.png"
                alt="view"
                className="doc-icon-img"
              />
            </button>

            <button
              className="doc-card-btn doc-card-btn-dl"
              title="Download redacted"
              onClick={() =>
                downloadFile(doc.id, 'redacted', doc.filename)
              }
            >
              <img
                src="https://cdn-icons-png.flaticon.com/512/11207/11207288.png"
                alt="download"
                className="doc-icon-img"
              />
            </button>

            <button
              className="doc-card-btn doc-card-btn-del"
              title="Delete document"
              onClick={() => onDelete(doc)}
            >
              <img
                src="https://cdn-icons-png.flaticon.com/128/484/484611.png"
                alt="delete"
                className="doc-icon-img"
              />
            </button>
          </div>
        </div>

        <div className="doc-card-body">
          <h3 className="doc-card-name" title={doc.filename}>
            {doc.filename}
          </h3>

          <p className="doc-card-time">
            {formatTime(doc.createdAt)}
          </p>
        </div>

        <div className="doc-card-stats">
          <div className="doc-card-stat">
            <span className="doc-card-stat-val">
              {doc.totalEntities?.toLocaleString() ?? '0'}
            </span>

            <span className="doc-card-stat-label">
              Entities
            </span>
          </div>

          <div className="doc-card-stat">
            <span className="doc-card-stat-val">
              {formatMs(doc.processingTimeMs)}
            </span>

            <span className="doc-card-stat-label">
              Time
            </span>
          </div>

          <div className="doc-card-stat">
            <span
              className="doc-card-stat-val"
              style={{ textTransform: 'capitalize' }}
            >
              {doc.redactionMethod ?? '—'}
            </span>

            <span className="doc-card-stat-label">
              Method
            </span>
          </div>
        </div>

        {topEntity && (
          <div className="doc-card-top-entity">
            <span
              className="doc-card-entity-dot"
              style={{
                background:
                  ENTITY_COLORS[topEntity[0]] || '#667eea',
              }}
            />

            <span className="doc-card-entity-text">
              Top:{' '}
              {ENTITY_LABELS[topEntity[0]] ||
                topEntity[0]}{' '}
              ({topEntity[1].toLocaleString()})
            </span>
          </div>
        )}

        <div className="doc-card-footer">
          <span
            className={`doc-card-status doc-card-status-${doc.status}`}
          >
            ✓ {doc.status}
          </span>

          <span
            className={`doc-card-orig ${
              doc.originalDeleted
                ? 'doc-card-orig-deleted'
                : 'doc-card-orig-ok'
            }`}
          >
            {doc.originalDeleted
              ? '⚠ Original deleted'
              : '● Original available'}
          </span>
        </div>
      </div>

      {viewerDoc && (
        <DocumentViewer
          document={viewerDoc}
          entities={viewerEntities}
          showSearch={false}
          onClose={() => {
            setViewerDoc(null);
            setViewerEntities([]);
          }}
        />
      )}
    </>
  );
};

const DeleteConfirmModal = ({ doc, onConfirm, onCancel, deleting }) => (
  <div className="doc-modal-overlay" onClick={onCancel}>
    <div className="doc-delete-modal" onClick={e => e.stopPropagation()}>
      <h3 className="doc-delete-title">Delete Document?</h3>
      <p className="doc-delete-msg">
        This will permanently delete <strong>{doc.filename}</strong> and all its entity data. This cannot be undone.
      </p>
      <div className="doc-delete-actions">
        <button className="doc-modal-btn doc-modal-btn-secondary" onClick={onCancel} disabled={deleting}>Cancel</button>
        <button className="doc-modal-btn doc-modal-btn-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

const Documents = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'User';
  const avatarInitials = username.slice(0, 2).toUpperCase();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [viewDoc, setViewDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchDocuments = useCallback(async (pg, q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg });
      if (q) params.set('search', q);
      const res = await authFetch(`${API}/documents?${params}`);
      const data = await res.json();
      setDocuments(data.documents || []);
      setPagination(data.pagination || null);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(page, search); }, [page, search, fetchDocuments]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
    searchRef.current?.focus();
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      await authFetch(`${API}/documents/${deleteDoc.id}`, { method: 'DELETE' });
      setDeleteDoc(null);
      fetchDocuments(page, search);
    } catch {
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    navigate('/', { replace: true });
  };

  const pageNums = pagination
    ? Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
        .reduce((acc, p, idx, arr) => {
          if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
          acc.push(p);
          return acc;
        }, [])
    : [];

  return (
    <div className="docs-page">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="logo">
            <img src="/final.png" alt="Logo" className="dashboard-logo-img" />
            <span>Data Dazzle</span>
          </div>
          <div className="nav-links">
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/dash'); }}>Dashboard</a>
            <a href="#" className="nav-link active" onClick={(e)=>{
              if(window.location.pathname==="/documents"){
                e.preventDefault();
                window.location.reload();
            }}}>Documents</a>
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

      <div className="docs-body">
        <div className="docs-header-row">
          <div>
            <h1 className="docs-title">My Documents</h1>
            <p className="docs-subtitle">
              {pagination ? `${pagination.total.toLocaleString()} document${pagination.total !== 1 ? 's' : ''}` : 'Loading...'}
              {search && (
                <span className="docs-search-tag">
                  {' '}· "{search}"
                  <button className="docs-search-tag-clear" onClick={handleSearchClear}>✕</button>
                </span>
              )}
            </p>
          </div>
          <form className={`docs-search-form ${searchFocused ? 'focused' : ''}`} onSubmit={handleSearch}>
                <img src="https://cdn-icons-png.flaticon.com/512/954/954591.png" alt="search" className="docs-search-icon"/>
            <input
              ref={searchRef}
              className="docs-search-input"
              placeholder="Search by filename..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchInput && (
              <button type="button" className="docs-search-clear" onClick={handleSearchClear}>✕</button>
            )}
            <button type="submit" className="docs-search-btn">Search</button>
          </form>
        </div>

        {loading ? (
          <div className="docs-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="doc-card doc-card-skeleton">
                <div className="skeleton skeleton-icon" />
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="docs-empty">
            <div className="docs-empty-icon">📂</div>
            <h3 className="docs-empty-title">{search ? 'No documents found' : 'No documents yet'}</h3>
            <p className="docs-empty-sub">
              {search
                ? `No results for "${search}". Try a different search.`
                : 'Upload your first document from the Dashboard to get started.'}
            </p>
            {search && <button className="docs-empty-btn" onClick={handleSearchClear}>Clear search</button>}
          </div>
        ) : (
          <div className="docs-grid">
            {documents.map(doc => (
              <DocCard key={doc.id} doc={doc} onView={setViewDoc} onDelete={setDeleteDoc} />
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="docs-pagination">
            <button className="docs-page-btn" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>
              ← Prev
            </button>
            <div className="docs-page-nums">
              {pageNums.map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} className="docs-page-ellipsis">…</span>
                ) : (
                  <button key={p} className={`docs-page-num ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                )
              )}
            </div>
            <button className="docs-page-btn" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>

      {viewDoc && <DocDetailModal doc={viewDoc} onClose={() => setViewDoc(null)} />}
      {deleteDoc && <DeleteConfirmModal doc={deleteDoc} onConfirm={handleDelete} onCancel={() => setDeleteDoc(null)} deleting={deleting} />}
    </div>
  );
};

export default Documents;
