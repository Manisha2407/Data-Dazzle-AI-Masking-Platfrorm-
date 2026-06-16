import { useRedact } from '../context/RedactContext';
import authFetch from '../utils/authFetch';

const ENTITY_COLORS = {
  PERSON:        '#9f7aea',
  EMAIL_ADDRESS: '#4299e1',
  PHONE_NUMBER:  '#48bb78',
  LOCATION:      '#ed8936',
  ORG:           '#667eea',
  AADHAAR:       '#e53e3e',
  PAN:           '#d69e2e',
  CREDIT_CARD:   '#e53e3e',
  BANK_ACCOUNT:  '#38b2ac',
  IFSC_CODE:     '#805ad5',
  PINCODE:       '#ed64a6',
  DATE_TIME:     '#718096',
  IP_ADDRESS:    '#2b6cb0',
  MAC_ADDRESS:   '#276749',
  URL:           '#c05621',
  DOMAIN:        '#b7791f',
  CRYPTO:        '#f6ad55',
};

const ENTITY_LABELS = {
  PERSON:        'Person',
  EMAIL_ADDRESS: 'Email',
  PHONE_NUMBER:  'Phone',
  LOCATION:      'Location',
  ORG:           'Organization',
  AADHAAR:       'Aadhaar',
  PAN:           'PAN Card',
  CREDIT_CARD:   'Credit Card',
  BANK_ACCOUNT:  'Bank Account',
  IFSC_CODE:     'IFSC Code',
  PINCODE:       'PIN Code',
  DATE_TIME:     'Date / Time',
  IP_ADDRESS:    'IP Address',
  MAC_ADDRESS:   'MAC Address',
  URL:           'URL',
  DOMAIN:        'Domain',
  CRYPTO:        'Crypto',
};

const ResultPopup = () => {
  const { result, clearResult, isProcessing } = useRedact();

  if (isProcessing) {
    return (
      <div style={styles.toast}>
        <div style={styles.toastInner}>
          <div style={styles.toastDot} />
          <span style={styles.toastText}>Processing your document — this may take a few minutes for large files...</span>
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (result.error) {
    return (
      <div style={{ ...styles.overlay }} onClick={clearResult}>
        <div style={{ ...styles.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
          <div style={styles.errorHeader}>
            <span style={styles.errorIcon}>⚠️</span>
            <h2 style={styles.errorTitle}>Processing Failed</h2>
          </div>
          <p style={styles.errorMsg}>{result.error}</p>
          <button style={styles.closeBtn} onClick={clearResult}>Close</button>
        </div>
      </div>
    );
  }

  const entityCounts = result.entityCounts || {};
  const topEntities = Object.entries(entityCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div style={styles.overlay} onClick={clearResult}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Redaction Complete</h2>
            <p style={styles.subtitle}>{result.filename}</p>
          </div>
          <button style={styles.xBtn} onClick={clearResult}>✕</button>
        </div>

        <div style={styles.metaRow}>
          <div style={styles.metaItem}>
            <span style={styles.metaVal}>{result.totalEntities ?? 0}</span>
            <span style={styles.metaLabel}>Entities Found</span>
          </div>
          <div style={styles.metaDivider} />
          <div style={styles.metaItem}>
            <span style={styles.metaVal}>{result.processingTimeMs ? (result.processingTimeMs / 1000).toFixed(1) + 's' : '—'}</span>
            <span style={styles.metaLabel}>Processing Time</span>
          </div>
          <div style={styles.metaDivider} />
          <div style={styles.metaItem}>
            <span style={styles.metaVal}>{result.filename?.split('.').pop()?.toUpperCase() ?? '—'}</span>
            <span style={styles.metaLabel}>File Type</span>
          </div>
        </div>

        {topEntities.length > 0 && (
          <div style={styles.entitiesSection}>
            <p style={styles.sectionLabel}>Detected Entity Types</p>
            <div style={styles.entityGrid}>
              {topEntities.map(([type, count]) => (
                <div key={type} style={styles.entityBadge}>
                  <span style={{ ...styles.entityDot, background: ENTITY_COLORS[type] || '#667eea' }} />
                  <span style={styles.entityType}>{ENTITY_LABELS[type] || type}</span>
                  <span style={styles.entityCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.previewSection}>
          <p style={styles.sectionLabel}>Redacted Preview</p>
          <div style={styles.previewBox}>
            {(result.redactedText || '').slice(0, 400)}{result.redactedText?.length > 400 ? '...' : ''}
          </div>
        </div>

        <div style={styles.actions}>
          <a
            href={`http://localhost:5000/api/documents/${result.documentId}/download/redacted`}
            style={styles.downloadBtn}
            onClick={e => {
              e.stopPropagation();
              const token = localStorage.getItem('accessToken');
              authFetch(`http://localhost:5000/api/documents/${result.documentId}/download/redacted`, {
                headers: { Authorization: `Bearer ${token}` },
              })
                .then(r => r.blob())
                .then(blob => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `redacted-${result.filename}`;
                  a.click();
                  URL.revokeObjectURL(url);
                });
              e.preventDefault();
            }}
          >
            ⬇ Download Redacted File
          </a>
          <button style={styles.closeBtn} onClick={clearResult}>Close</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  toast: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease',
  },
  toastInner: {
    background: 'white',
    borderRadius: 12,
    padding: '14px 20px',
    boxShadow: '0 4px 24px rgba(102,126,234,0.18)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    maxWidth: 380,
    border: '1px solid rgba(102,126,234,0.15)',
  },
  toastDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#667eea',
    flexShrink: 0,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  toastText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 1.5,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,10,40,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  },
  modal: {
    background: 'white',
    borderRadius: 20,
    padding: '2rem',
    width: '100%',
    maxWidth: 600,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(102,126,234,0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#2d3748',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#718096',
    marginTop: 4,
  },
  xBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: '#a0aec0',
    padding: '0 4px',
    lineHeight: 1,
  },
  metaRow: {
    display: 'flex',
    background: '#f7fafc',
    borderRadius: 12,
    padding: '1rem',
    marginBottom: '1.5rem',
    gap: '1rem',
  },
  metaItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  metaVal: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#667eea',
  },
  metaLabel: {
    fontSize: '0.8rem',
    color: '#718096',
    textAlign: 'center',
  },
  metaDivider: {
    width: 1,
    background: '#e2e8f0',
    alignSelf: 'stretch',
  },
  sectionLabel: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
  },
  entitiesSection: {
    marginBottom: '1.5rem',
  },
  entityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  entityBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0.5rem 0.75rem',
    background: '#f7fafc',
    borderRadius: 8,
    fontSize: '0.85rem',
  },
  entityDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  entityType: {
    flex: 1,
    color: '#2d3748',
    fontSize: '0.82rem',
  },
  entityCount: {
    fontWeight: 700,
    color: '#667eea',
    fontSize: '0.82rem',
  },
  previewSection: {
    marginBottom: '1.5rem',
  },
  previewBox: {
    background: '#f7fafc',
    borderRadius: 10,
    padding: '1rem',
    fontSize: '0.85rem',
    color: '#4a5568',
    lineHeight: 1.7,
    maxHeight: 140,
    overflowY: 'auto',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
  },
  downloadBtn: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.9rem',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  closeBtn: {
    background: '#f7fafc',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    padding: '0.75rem 1.5rem',
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: '1rem',
  },
  errorIcon: { fontSize: '1.5rem' },
  errorTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#2d3748', margin: 0 },
  errorMsg: { color: '#718096', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 },
};

export default ResultPopup;
