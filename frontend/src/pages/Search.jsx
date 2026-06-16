import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentViewer from '../components/DocumentViewer';
import '../style/search.css';
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
  LOCATION: 'Location', ORG: 'Organization', AADHAAR: 'Aadhaar', PAN: 'PAN',
  CREDIT_CARD: 'Credit Card', BANK_ACCOUNT: 'Bank Account', IFSC_CODE: 'IFSC',
  PINCODE: 'PIN Code', DATE_TIME: 'Date/Time', IP_ADDRESS: 'IP Address',
  MAC_ADDRESS: 'MAC', URL: 'URL', DOMAIN: 'Domain', CRYPTO: 'Crypto',
};

  const FILE_ICONS = { pdf: 'https://cdn-icons-png.flaticon.com/128/9496/9496432.png', 
    docx: 'https://cdn-icons-png.flaticon.com/128/10451/10451822.png', 
    txt: 'https://cdn-icons-png.flaticon.com/128/8243/8243060.png' };

const SENSITIVITY_CONFIG = {
  low:    { label: 'Low Risk',    color: '#48bb78', bg: 'rgba(72,187,120,0.1)' },
  medium: { label: 'Medium Risk', color: '#ed8936', bg: 'rgba(237,137,54,0.1)' },
  high:   { label: 'High Risk',   color: '#e53e3e', bg: 'rgba(229,62,62,0.1)' },
};

const getSensitivityLevel = (score) => {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  return 'high';
};

const formatTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ResultCard = ({ result, onView }) => {
  const level = getSensitivityLevel(result.sensitivityScore || 0);
  const cfg   = SENSITIVITY_CONFIG[level];
  const topEntities = Object.entries(result.entityCounts || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="sr-card" onClick={() => onView(result)}>
      <div className="sr-card-top">
        <div className="sr-card-icon-row">
          <span className="sr-card-file-icon">
            <img src={FILE_ICONS[result.fileType] || 'https://cdn-icons-png.flaticon.com/128/8243/8243060.png'} alt={result.fileType} className="sr-card-file-icon-img"/>
          </span>
          <span className={`sr-card-type-badge sr-type-${result.fileType}`}>{result.fileType?.toUpperCase()}</span>
        </div>
        <span className="sr-card-sensitivity" style={{ color: cfg.color, background: cfg.bg }}>
          {cfg.label}
        </span>
      </div>

      <div className="sr-card-body">
        <h3 className="sr-card-name" title={result.filename}>{result.filename}</h3>
        <p className="sr-card-date">{formatTime(result.createdAt)}</p>
      </div>

      {result.highlights?.redactedText?.length > 0 && (
        <div className="sr-card-highlights">
          {result.highlights.redactedText.slice(0, 2).map((h, i) => (
            <p key={i} className="sr-card-highlight" dangerouslySetInnerHTML={{ __html: `...${h}...` }} />
          ))}
        </div>
      )}

      <div className="sr-card-stats">
        <div className="sr-card-stat">
          <span className="sr-stat-val">{result.totalEntities?.toLocaleString() ?? 0}</span>
          <span className="sr-stat-label">Entities</span>
        </div>
        <div className="sr-card-stat">
          <span className="sr-stat-val">{result.sensitivityScore ?? 0}</span>
          <span className="sr-stat-label">Risk Score</span>
        </div>
        <div className="sr-card-stat">
          <span className="sr-stat-val" style={{ textTransform: 'capitalize' }}>{result.redactionMethod ?? '—'}</span>
          <span className="sr-stat-label">Method</span>
        </div>
      </div>

      {topEntities.length > 0 && (
        <div className="sr-card-entities">
          {topEntities.map(([type, count]) => (
            <span key={type} className="sr-entity-chip" style={{ background: `${ENTITY_COLORS[type]}18`, color: ENTITY_COLORS[type] || '#667eea', border: `1px solid ${ENTITY_COLORS[type]}40` }}>
              {ENTITY_LABELS[type] || type}: {count}
            </span>
          ))}
        </div>
      )}

      <div className="sr-card-footer">
        <span className="sr-card-view-hint">Click to view document →</span>
      </div>
    </div>
  );
};

const Search = () => {
  const navigate  = useNavigate();
  const username  = localStorage.getItem('username') || 'User';
  const avatarInitials = username.slice(0, 2).toUpperCase();
  const dropdownRef    = useRef(null);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query,        setQuery]        = useState('');
  const [entityText,   setEntityText]   = useState('');
  const [results,      setResults]      = useState([]);
  const [total,        setTotal]        = useState(0);
  const [totalPages,   setTotalPages]   = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [searched,     setSearched]     = useState(false);
  const [suggestions,  setSuggestions]  = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewDoc,      setViewDoc]      = useState(null);
  const [viewEntities, setViewEntities] = useState([]);
  const [loadingDoc,   setLoadingDoc]   = useState(false);
  const [aggregations, setAggregations] = useState(null);

  const [filters, setFilters] = useState({
    entityType:      '',
    fileType:        '',
    redactionMethod: '',
    minEntities:     '',
    maxEntities:     '',
    minSensitivity:  '',
    dateFrom:        '',
    dateTo:          '',
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

const buildParams = useCallback((pg = 1, overrideFilters = filters) => {
  const p = new URLSearchParams({
    page: pg,
    pageSize: 9,
  });

  if (query.trim())
    p.set('q', query.trim());

  if (entityText.trim())
    p.set('entityText', entityText.trim());

  if (overrideFilters.entityType)
    p.set('entityType', overrideFilters.entityType);

  if (overrideFilters.fileType)
    p.set('fileType', overrideFilters.fileType);

  if (overrideFilters.redactionMethod)
    p.set('redactionMethod', overrideFilters.redactionMethod);

  if (overrideFilters.minEntities)
    p.set('minEntities', overrideFilters.minEntities);

  if (overrideFilters.maxEntities)
    p.set('maxEntities', overrideFilters.maxEntities);

  if (overrideFilters.minSensitivity)
    p.set('minSensitivity', overrideFilters.minSensitivity);

  if (overrideFilters.dateFrom)
    p.set('dateFrom', overrideFilters.dateFrom);

  if (overrideFilters.dateTo)
    p.set('dateTo', overrideFilters.dateTo);

  return p;
}, [query, entityText, filters]);

const doSearch = useCallback(async (pg = 1, overrideFilters = filters) => {
  setLoading(true);
  setSearched(true);

  try {
    const res = await authFetch(
      `${API}/search?${buildParams(pg, overrideFilters)}`
    );

    const data = await res.json();

    setResults(data.results || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 0);
    setPage(pg);
    setAggregations(data.aggregations || null);

  } catch {
    setResults([]);
  } finally {
    setLoading(false);
  }
}, [buildParams, filters]);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setSuggestions([]); return; }
    try {
      const res  = await authFetch(`${API}/search/suggestions?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions(entityText), 250);
    return () => clearTimeout(t);
  }, [entityText, fetchSuggestions]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    doSearch(1);
  };

  const handleSuggestionClick = (text) => {
    setEntityText(text);
    setShowSuggestions(false);
    setTimeout(() => doSearch(1), 50);
  };

  const handleViewDoc = async (result) => {
    setLoadingDoc(true);
    try {
      const res  = await authFetch(`${API}/documents/${result.documentId}`);
      const data = await res.json();
      setViewDoc({ ...result, redactedText: result.redactedText || data.document?.redactedText || '' });
      setViewEntities(data.document?.entities || []);
    } catch {
      setViewDoc(result);
      setViewEntities([]);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleFilterChange = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const handleClearFilters = () => {
    setFilters({ entityType: '', fileType: '', redactionMethod: '', minEntities: '', maxEntities: '', minSensitivity: '', dateFrom: '', dateTo: '' });
    setQuery('');
    setEntityText('');
    setResults([]);
    setSearched(false);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (query ? 1 : 0) + (entityText ? 1 : 0);

  return (
    <div className="search-page">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="logo">
            <img src="/final.png" alt="Logo" className="dashboard-logo-img" />
            <span>Data Dazzle</span>
          </div>
          <div className="nav-links">
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate('/dash'); }}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate('/documents'); }}>Documents</a>
                        <a href="#" className="nav-link active" onClick={(e)=>{
              if(window.location.pathname==="/search"){
                e.preventDefault();
                window.location.reload();
            }}}>Search</a>
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
                  <div className="dropdown-user-info"><span className="dropdown-username">{username}</span></div>
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

      <div className="search-body">
        <div className="search-hero">
          <h1 className="search-hero-title">Search Your Documents</h1>
          <p className="search-hero-sub">Full-text search across all your redacted documents and detected entities</p>

          <form className="search-main-form" onSubmit={handleSearchSubmit}>
            <div className="search-main-input-wrap">
              <span className="search-main-icon">
                <img
                  src="https://cdn-icons-png.flaticon.com/128/16799/16799322.png"
                  alt="search"
                  className="search-main-icon-img"
                />
              </span>

              <input
                ref={searchInputRef}
                className="search-main-input"
                placeholder="Search document content..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
              />

              {query && (
                <button
                  type="button"
                  className="search-main-clear"
                  onClick={() => setQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="search-entity-wrap" ref={suggestionsRef}>
              <span className="search-entity-icon">
                <img
                  src="https://cdn-icons-png.flaticon.com/128/1374/1374863.png"
                  alt="entity"
                  className="search-entity-icon-img"
                />
              </span>
            
              <input
                className="search-entity-input"
                placeholder="Search by entity text..."
                value={entityText}
                onChange={e => {
                  setEntityText(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                autoComplete="off"
              />

              {entityText && (
                <button
                  type="button"
                  className="search-main-clear"
                  onClick={() => {
                    setEntityText('');
                    setSuggestions([]);
                  }}
                >
                  ✕
                </button>
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="search-suggestions">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="search-suggestion-item"
                      onClick={() => handleSuggestionClick(s.text)}
                    >
                      <span className="suggestion-icon">🔎</span>
                      <span className="suggestion-text">{s.text}</span>
                      <span className="suggestion-count">
                        {s.count} occurrences
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              className="search-submit-btn"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            
          </form>

          <div className="search-quick-filters">
            <button className="search-quick-btn" onClick={() => { const updatedFilters = { ...filters, minSensitivity: '60' }; setFilters(updatedFilters); doSearch(1, updatedFilters); }}><img src="https://cdn-icons-png.flaticon.com/128/14035/14035711.png" alt="risk" className="search-quick-icon" /> High Risk</button>
            <button className="search-quick-btn" onClick={() => { const updatedFilters = { ...filters, entityType: 'AADHAAR' }; setFilters(updatedFilters); doSearch(1, updatedFilters); }}><img src="https://cdn-icons-png.flaticon.com/128/3596/3596097.png" alt="aadhaar" className="search-quick-icon" /> Has Aadhaar</button>
            <button className="search-quick-btn" onClick={() => { const updatedFilters = { ...filters, entityType: 'CREDIT_CARD' }; setFilters(updatedFilters); doSearch(1, updatedFilters); }}><img src="https://cdn-icons-png.flaticon.com/128/9334/9334539.png" alt="card" className="search-quick-icon" /> Has Credit Card</button>
            <button className="search-quick-btn" onClick={() => { const updatedFilters = { ...filters, fileType: 'pdf' }; setFilters(updatedFilters); doSearch(1, updatedFilters); }}><img src="https://cdn-icons-png.flaticon.com/128/9496/9496432.png" alt="pdf" className="search-quick-icon" /> PDFs Only</button>
            <button className="search-quick-btn" onClick={() => { const updatedFilters = { ...filters, minEntities: '50' }; setFilters(updatedFilters); doSearch(1, updatedFilters); }}><img src="https://cdn-icons-png.flaticon.com/128/15698/15698199.png" alt="pii" className="search-quick-icon" /> High PII Volume</button>
          </div>
        </div>

        <div className="search-content">
          <aside className="search-filters-panel">
            <div className="sfp-header">
              <h3 className="sfp-title">Filters</h3>
              {activeFilterCount > 0 && (
                <button className="sfp-clear" onClick={handleClearFilters}>Clear all ({activeFilterCount})</button>
              )}
            </div>

            <div className="sfp-group">
              <label className="sfp-label">Entity Type</label>
              <select className="sfp-select" value={filters.entityType} onChange={e => handleFilterChange('entityType', e.target.value)}>
                <option value="">All types</option>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="sfp-group">
              <label className="sfp-label">File Type</label>
              <div className="sfp-radio-group">
                {['', 'pdf', 'docx', 'txt'].map(ft => (
                  <label key={ft} className={`sfp-radio ${filters.fileType === ft ? 'active' : ''}`}>
                    <input type="radio" name="fileType" value={ft} checked={filters.fileType === ft} onChange={() => handleFilterChange('fileType', ft)} />
                    {ft === '' ? 'All' : ft.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>

            <div className="sfp-group">
              <label className="sfp-label">Redaction Method</label>
              <select className="sfp-select" value={filters.redactionMethod} onChange={e => handleFilterChange('redactionMethod', e.target.value)}>
                <option value="">All methods</option>
                <option value="mask">Mask</option>
                <option value="hash">Hash</option>
                <option value="remove">Remove</option>
                <option value="fake">Fake</option>
              </select>
            </div>

            <div className="sfp-group">
              <label className="sfp-label">Min Risk Score</label>
              <div className="sfp-slider-row">
                <input type="range" min="0" max="100" value={filters.minSensitivity || 0} onChange={e => handleFilterChange('minSensitivity', e.target.value)} className="sfp-slider" />
                <span className="sfp-slider-val">{filters.minSensitivity || 0}</span>
              </div>
              <div className="sfp-risk-labels">
                <span style={{ color: '#48bb78' }}>Low</span>
                <span style={{ color: '#ed8936' }}>Med</span>
                <span style={{ color: '#e53e3e' }}>High</span>
              </div>
            </div>

            <div className="sfp-group">
              <label className="sfp-label">Min Entities</label>
              <input className="sfp-input" type="number" min="0" placeholder="e.g. 10" value={filters.minEntities} onChange={e => handleFilterChange('minEntities', e.target.value)} />
            </div>

            <div className="sfp-group">
              <label className="sfp-label">Date From</label>
     
              <input
                className="sfp-input"
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const value = e.target.value;
                
                  if (filters.dateTo && value > filters.dateTo) {
                    return;
                  }
                
                  handleFilterChange('dateFrom', value);
                }}
              />
            </div>
              
            <div className="sfp-group">
              <label className="sfp-label">Date To</label>
              
              <input
                className="sfp-input"
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const value = e.target.value;
                
                  if (filters.dateFrom && value < filters.dateFrom) {
                    return;
                  }
                
                  handleFilterChange('dateTo', value);
                }}
              />
            </div>

            <button className="sfp-apply-btn" onClick={() => doSearch(1)} disabled={loading}>
              Apply Filters
            </button>

            {aggregations && (
              <div className="sfp-agg-section">
                <p className="sfp-agg-title">Result Breakdown</p>
                {aggregations.fileTypes?.map(ft => (
                  <div key={ft.key} className="sfp-agg-row">
                    <span>{ft.key?.toUpperCase()}</span>
                    <span className="sfp-agg-count">{ft.doc_count}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <div className="search-results-area">
            {!searched && !loading && (
              <div className="search-empty-state">
                <div className="ses-icon">
                  <img src="https://cdn-icons-png.flaticon.com/128/2170/2170040.png" alt="search" className="ses-icon-img" />
                </div>
                <h3 className="ses-title">Start searching</h3>
                <p className="ses-sub">Search across all your documents by content, entity type, or use the quick filters above</p>
              </div>
            )}

            {loading && (
              <div className="search-results-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="sr-card sr-card-skeleton">
                    <div className="skeleton skeleton-icon" />
                    <div className="skeleton skeleton-title" />
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-line short" />
                  </div>
                ))}
              </div>
            )}

            {searched && !loading && results.length === 0 && (
              <div className="search-empty-state">
                <div className="ses-icon">📂</div>
                <h3 className="ses-title">No results found</h3>
                <p className="ses-sub">Try different search terms or relax your filters</p>
                <button className="ses-clear-btn" onClick={handleClearFilters}>Clear all filters</button>
              </div>
            )}

            {!loading && results.length > 0 && (
              <>
                <div className="search-results-header">
                  <p className="search-results-count">
                    <strong>{total.toLocaleString()}</strong> result{total !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="search-results-grid">
                  {results.map((result, i) => (
                    <ResultCard key={`${result.documentId}-${i}`} result={result} onView={handleViewDoc} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="search-pagination">
                    <button className="search-page-btn" disabled={page <= 1} onClick={() => doSearch(page - 1)}>← Prev</button>
                    <span className="search-page-info">Page {page} of {totalPages}</span>
                    <button className="search-page-btn" disabled={page >= totalPages} onClick={() => doSearch(page + 1)}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {loadingDoc && (
        <div className="search-loading-overlay">
          <div className="search-loading-spinner" />
        </div>
      )}

      {viewDoc && (
        <DocumentViewer
          document={viewDoc}
          entities={viewEntities}
          showSearch={true}
          onClose={() => { setViewDoc(null); setViewEntities([]); }}
        />
      )}
    </div>
  );
};

export default Search;
