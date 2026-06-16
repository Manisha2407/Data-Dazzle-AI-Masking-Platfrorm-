import { useState, useEffect, useRef, useCallback } from 'react';
import '../style/DocumentViewer.css';

const ENTITY_COLORS = {
  PERSON:        { bg: 'rgba(159,122,234,0.18)', border: '#9f7aea', label: 'Person' },
  EMAIL_ADDRESS: { bg: 'rgba(66,153,225,0.18)',  border: '#4299e1', label: 'Email' },
  PHONE_NUMBER:  { bg: 'rgba(72,187,120,0.18)',  border: '#48bb78', label: 'Phone' },
  LOCATION:      { bg: 'rgba(237,137,54,0.18)',  border: '#ed8936', label: 'Location' },
  ORG:           { bg: 'rgba(102,126,234,0.18)', border: '#667eea', label: 'Organization' },
  AADHAAR:       { bg: 'rgba(229,62,62,0.18)',   border: '#e53e3e', label: 'Aadhaar' },
  PAN:           { bg: 'rgba(214,158,46,0.18)',  border: '#d69e2e', label: 'PAN' },
  CREDIT_CARD:   { bg: 'rgba(252,129,129,0.18)', border: '#fc8181', label: 'Credit Card' },
  BANK_ACCOUNT:  { bg: 'rgba(56,178,172,0.18)',  border: '#38b2ac', label: 'Bank Account' },
  IFSC_CODE:     { bg: 'rgba(128,90,213,0.18)',  border: '#805ad5', label: 'IFSC Code' },
  PINCODE:       { bg: 'rgba(237,100,166,0.18)', border: '#ed64a6', label: 'PIN Code' },
  DATE_TIME:     { bg: 'rgba(113,128,150,0.18)', border: '#718096', label: 'Date/Time' },
  IP_ADDRESS:    { bg: 'rgba(43,108,176,0.18)',  border: '#2b6cb0', label: 'IP Address' },
  MAC_ADDRESS:   { bg: 'rgba(39,103,73,0.18)',   border: '#276749', label: 'MAC Address' },
  URL:           { bg: 'rgba(192,86,33,0.18)',   border: '#c05621', label: 'URL' },
  DOMAIN:        { bg: 'rgba(183,121,31,0.18)',  border: '#b7791f', label: 'Domain' },
  CRYPTO:        { bg: 'rgba(246,173,85,0.18)',  border: '#f6ad55', label: 'Crypto' },
};

const DEFAULT_COLOR = { bg: 'rgba(102,126,234,0.18)', border: '#667eea', label: 'Entity' };

const buildSegments = (text, activeTypes) => {
  if (!text) {
    return [{ type: 'text', content: '' }];
  }

  const regex = /\[(.*?)\]/g;

  const segments = [];

  let lastIndex = 0;

  let match;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];

    const entityType = match[1];

    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const shouldHighlight =
      activeTypes.size === 0 ||
      activeTypes.has(entityType);

    segments.push({
      type: shouldHighlight ? 'entity' : 'text',
      content: fullMatch,
      entityType,
      confidence: 1,
    });

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
};

const highlightSearchInSegments = (segments, searchTerm, currentMatchIdx, matchRefs) => {
  if (!searchTerm) return segments;

  const result = [];
  let globalMatchIdx = 0;

  for (const seg of segments) {
    if (seg.type === 'entity') {
      result.push(seg);
      continue;
    }

    const parts = seg.content.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    for (const part of parts) {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        const isCurrent = globalMatchIdx === currentMatchIdx;
        result.push({
          type:         'search-match',
          content:      part,
          isCurrent,
          matchIdx:     globalMatchIdx,
          ref:          isCurrent ? matchRefs : null,
        });
        globalMatchIdx++;
      } else if (part) {
        result.push({ type: 'text', content: part });
      }
    }
  }

  return result;
};

const countMatches = (text, searchTerm) => {
  if (!text || !searchTerm) return 0;
  const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return (text.match(regex) || []).length;
};

const DocumentViewer = ({ document: doc, entities, showSearch = false, onClose }) => {
  const [activeTypes,      setActiveTypes]      = useState(new Set());
  const [searchTerm,       setSearchTerm]       = useState('');
  const [currentMatch,     setCurrentMatch]     = useState(0);
  const [totalMatches,     setTotalMatches]      = useState(0);
  const [filteredEntities, setFilteredEntities] = useState(entities || []);

  const currentMatchRef = useRef(null);
  const contentRef      = useRef(null);
  const searchInputRef  = useRef(null);

  const entityTypes = [...new Set((entities || []).map(e => e.entityType))].filter(Boolean);

  useEffect(() => {
    setFilteredEntities(
      activeTypes.size === 0
        ? (entities || [])
        : (entities || []).filter(e => activeTypes.has(e.entityType))
    );
  }, [activeTypes, entities]);

  useEffect(() => {
    if (searchTerm) {
      setTotalMatches(countMatches(doc?.redactedText || '', searchTerm));
      setCurrentMatch(0);
    } else {
      setTotalMatches(0);
      setCurrentMatch(0);
    }
  }, [searchTerm, doc]);

  useEffect(() => {
    if (currentMatchRef.current) {
      currentMatchRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatch, searchTerm]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && searchTerm && totalMatches > 0) {
        e.shiftKey ? handlePrevMatch() : handleNextMatch();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [searchTerm, totalMatches, currentMatch]);

  const handleNextMatch = useCallback(() => {
    setCurrentMatch(prev => (prev + 1) % totalMatches);
  }, [totalMatches]);

  const handlePrevMatch = useCallback(() => {
    setCurrentMatch(prev => (prev - 1 + totalMatches) % totalMatches);
  }, [totalMatches]);

  const toggleEntityType = (type) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const segments = buildSegments(doc?.redactedText || '',activeTypes);
  const finalSegments = highlightSearchInSegments(segments, searchTerm, currentMatch, currentMatchRef);

  const renderSegment = (seg, idx) => {
    if (seg.type === 'text') {
      return <span key={idx}>{seg.content}</span>;
    }

    if (seg.type === 'search-match') {
      return (
        <mark
          key={idx}
          ref={seg.isCurrent ? currentMatchRef : null}
          className={`dv-search-mark ${seg.isCurrent ? 'dv-search-mark-current' : ''}`}
        >
          {seg.content}
        </mark>
      );
    }

    if (seg.type === 'entity') {
      const cfg = ENTITY_COLORS[seg.entityType] || DEFAULT_COLOR;
      return (
        <span
          key={idx}
          className="dv-entity-span"
          style={{ background: cfg.bg, borderBottom: `2px solid ${cfg.border}` }}
          title={`${cfg.label} (${Math.round((seg.confidence || 1) * 100)}% confidence)`}
        >
          {seg.content}
        </span>
      );
    }

    return null;
  };

  if (!doc) return null;

  return (
    <div className="dv-overlay" onClick={onClose}>
      <div className="dv-modal" onClick={e => e.stopPropagation()}>

        <div className="dv-header">
          <div className="dv-header-left">
            <span className="dv-header-icon">
              <img src="https://cdn-icons-png.flaticon.com/128/3073/3073464.png" alt={document.fileType} className="dv-header-icon-img"/>
            </span>
            <div>
              <h2 className="dv-header-title">{doc.filename || 'Document'}</h2>
              <p className="dv-header-sub">
                {doc.totalEntities?.toLocaleString() ?? 0} entities detected
                {doc.redactionMethod && ` · ${doc.redactionMethod} method`}
              </p>
            </div>
          </div>
          <div className="dv-header-right">
            <button className="dv-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>

        {showSearch && (
          <div className="dv-search-bar">
            <span className="dv-search-icon">
              <img src="https://cdn-icons-png.flaticon.com/128/16799/16799322.png" alt="search" className="dv-search-icon-img"/>
            </span>
            <input
              ref={searchInputRef}
              className="dv-search-input"
              placeholder="Search in document..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && totalMatches > 0 && (
              <span className="dv-match-count">{currentMatch + 1} / {totalMatches}</span>
            )}
            {searchTerm && totalMatches === 0 && (
              <span className="dv-no-match">No matches</span>
            )}
            {searchTerm && (
              <>
                <button className="dv-nav-btn" onClick={handlePrevMatch} disabled={totalMatches === 0} title="Previous (Shift+Enter)">↑</button>
                <button className="dv-nav-btn" onClick={handleNextMatch} disabled={totalMatches === 0} title="Next (Enter)">↓</button>
                <button className="dv-search-clear" onClick={() => setSearchTerm('')}>✕</button>
              </>
            )}
          </div>
        )}

        <div className="dv-body">
          <div className="dv-content-area" ref={contentRef}>
            {!doc.redactedText ? (
              <div className="dv-no-content">
                <p>Document content not available.</p>
                <p className="dv-no-content-sub">Full text search requires documents processed after ELK integration.</p>
              </div>
            ) : (
              <div className={`dv-text ${doc?.filename?.toLowerCase().endsWith('.docx') ? 'dv-text-docx' : ''}`} spellCheck={false} data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false">
                {finalSegments.map((seg, i) => renderSegment(seg, i))}
              </div>
            )}
          </div>

          <aside className="dv-legend">
            <div className="dv-legend-header">
              <h3 className="dv-legend-title">Entity Types</h3>
              {activeTypes.size > 0 && (
                <button className="dv-legend-clear" onClick={() => setActiveTypes(new Set())}>Show all</button>
              )}
            </div>
            <p className="dv-legend-hint">Click to filter highlights</p>

            <div className="dv-legend-list">
              {entityTypes.length === 0 ? (
                <p className="dv-legend-empty">No entities detected</p>
              ) : (
                entityTypes.map(type => {
                  const cfg   = ENTITY_COLORS[type] || DEFAULT_COLOR;
                  const count = (entities || []).filter(e => e.entityType === type).length;
                  const isActive = activeTypes.size === 0 || activeTypes.has(type);
                  return (
                    <button
                      key={type}
                      className={`dv-legend-item ${!isActive ? 'dv-legend-item-muted' : ''}`}
                      onClick={() => toggleEntityType(type)}
                      style={{ '--entity-color': cfg.border, '--entity-bg': cfg.bg }}
                    >
                      <span className="dv-legend-dot" style={{ background: cfg.border }} />
                      <span className="dv-legend-label">{cfg.label}</span>
                      <span className="dv-legend-count">{count}</span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="dv-legend-key">
              <p className="dv-legend-key-title">Legend</p>
              <div className="dv-legend-key-item">
                <span className="dv-example-entity" style={{ background: 'rgba(159,122,234,0.18)', borderBottom: '2px solid #9f7aea' }}>Entity</span>
                <span className="dv-key-label">Highlighted entity</span>
              </div>
              {showSearch && (
                <>
                  <div className="dv-legend-key-item">
                    <mark className="dv-search-mark">match</mark>
                    <span className="dv-key-label">Search result</span>
                  </div>
                  <div className="dv-legend-key-item">
                    <mark className="dv-search-mark dv-search-mark-current">current</mark>
                    <span className="dv-key-label">Current match</span>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
