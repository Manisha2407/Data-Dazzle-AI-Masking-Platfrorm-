import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';
import '../style/analytics.css';
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

const CHART_PALETTE = [
  '#667eea', '#9f7aea', '#4299e1', '#48bb78', '#ed8936',
  '#e53e3e', '#d69e2e', '#38b2ac', '#805ad5', '#ed64a6',
  '#718096', '#2b6cb0', '#276749', '#c05621', '#b7791f', '#f6ad55', '#fc8181',
];

const SENSITIVITY_COLORS = { low: '#48bb78', medium: '#ed8936', high: '#e53e3e' };

const formatMs = (ms) => {
  if (!ms) return '0ms';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-tooltip">
      {label && <p className="an-tooltip-label">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="an-tooltip-item" style={{ color: p.color }}>
          <span>{p.name}:</span> <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="an-stat-card" style={{ '--accent': color }}>
    <div className="an-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
    <div className="an-stat-body">
      <p className="an-stat-value">{value}</p>
      <p className="an-stat-label">{label}</p>
      {sub && <p className="an-stat-sub">{sub}</p>}
    </div>
  </div>
);

const ChartCard = ({ title, subtitle, children, className = '' }) => (
  <div className={`an-chart-card ${className}`}>
    <div className="an-chart-header">
      <div>
        <h3 className="an-chart-title">{title}</h3>
        {subtitle && <p className="an-chart-subtitle">{subtitle}</p>}
      </div>
    </div>
    <div className="an-chart-body">{children}</div>
  </div>
);

const EmptyChart = ({ message = 'No data available' }) => (
  <div className="an-empty-chart">
    <span className="an-empty-icon">
      <img src="https://cdn-icons-png.flaticon.com/128/900/900809.png" alt="empty-chart" className="an-empty-icon-img" />
    </span>
    <p>{message}</p>
  </div>
);

const Analytics = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'User';
  const avatarInitials = username.slice(0, 2).toUpperCase();
  const dropdownRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');

  const [scatterData, setScatterData] = useState([]);

  useEffect(() => {
    authFetch(`${API}/analytics/size-vs-time`)
      .then(r => r.json())
      .then(d => setScatterData(d.data || []))
      .catch(() => {});
  }, []);

  const [heatmapData, setHeatmapData] = useState({ rows: [], days: [], hours: [] });

  useEffect(() => {
    authFetch(`${API}/analytics/heatmap`)
      .then(r => r.json())
      .then(d => setHeatmapData(d))
      .catch(() => {});
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo)   params.set('dateTo',   dateTo);
      const res  = await authFetch(`${API}/analytics?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => { localStorage.clear(); navigate('/', { replace: true }); };

  const entityPieData = (data?.entityDistribution || []).map(e => ({
    name:  ENTITY_LABELS[e.entityType] || e.entityType,
    value: e.count,
    color: ENTITY_COLORS[e.entityType] || '#667eea',
    type:  e.entityType,
  }));

  const sensitivityData = (data?.sensitivityDistribution || [])
    .filter(s => s.count > 0)
    .map(s => {
      const low  = parseInt(s.range?.split('-')[0] || 0);
      const level = low < 30 ? 'low' : low < 60 ? 'medium' : 'high';
      return { name: s.range, count: s.count, fill: SENSITIVITY_COLORS[level] };
    });

  const docsOverTime = (data?.docsOverTime || []).map(d => ({
    date:     d.date,
    Documents: d.documents,
    Entities:  d.totalEntities,
  }));

  const fileTypeData = (data?.byFileType || []).map(f => ({
    name:        f.fileType?.toUpperCase() || 'Unknown',
    'Avg Entities': f.avgEntities,
    'Avg Risk':     f.avgSensitivity,
  }));

  const confidenceData = (data?.confidenceDistribution || [])
    .filter(c => c.count > 0)
    .map(c => ({ name: c.range, count: c.count }));

  const lowConfData = (data?.lowConfidenceByType || []).map(l => ({
    name:  ENTITY_LABELS[l.entityType] || l.entityType,
    count: l.count,
    fill:  ENTITY_COLORS[l.entityType] || '#667eea',
  }));

  const methodData = (data?.byRedactionMethod || []).map(m => ({
    name: m.method?.charAt(0).toUpperCase() + m.method?.slice(1),
    value: m.count,
  }));

  return (
    <div className="analytics-page">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="logo">
            <img src="/final.png" alt="Logo" className="dashboard-logo-img" />
            <span>Data Dazzle</span>
          </div>
          <div className="nav-links">
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate('/dash'); }}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate('/documents'); }}>Documents</a>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate('/search'); }}>Search</a>
                        <a href="#" className="nav-link active" onClick={(e)=>{
              if(window.location.pathname==="/analytics"){
                e.preventDefault();
                window.location.reload();
            }}}>Analytics</a>
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

      <div className="an-body">
        <div className="an-page-header">
          <div>
            <h1 className="an-page-title">Analytics</h1>
            <p className="an-page-sub">Insights across all your redacted documents</p>
          </div>
            <div className="an-date-filter">
              <label className="an-date-label">From</label>

              <input
                className="an-date-input"
                type="date"
                value={dateFrom}
                min={undefined}
                max={dateTo || new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const value = e.target.value;
                
                  if (dateTo && value > dateTo) {
                    return;
                  }
                
                  setDateFrom(value);
                }}
              />

              <label className="an-date-label">To</label>
              
              <input
                className="an-date-input"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const value = e.target.value;
                
                  if (dateFrom && value < dateFrom) {
                    return;
                  }
                
                  setDateTo(value);
                }}
              />

              <button className="an-apply-btn" onClick={fetchAnalytics} disabled={loading}>
                {loading ? '...' : 'Apply'}
              </button>
              
              {(dateFrom || dateTo) && (
                <button
                  className="an-clear-btn"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setTimeout(fetchAnalytics, 50);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
        </div>

        {loading ? (
          <div className="an-loading">
            <div className="an-loading-spinner" />
            <p>Loading analytics...</p>
          </div>
        ) : !data ? (
          <div className="an-error">
            <p>Failed to load analytics. Make sure Elasticsearch is running.</p>
            <button className="an-apply-btn" onClick={fetchAnalytics}>Retry</button>
          </div>
        ) : (
          <>
            <div className="an-stats-row">
              <StatCard icon={<img src="https://cdn-icons-png.flaticon.com/128/3073/3073412.png" alt="docs" className="an-stat-icon-img" />} label="Total Documents" value={(data.summary?.totalDocuments ?? 0).toLocaleString()} color="#667eea" />
              <StatCard icon={<img src="https://cdn-icons-png.flaticon.com/128/1374/1374863.png" alt="entities" className="an-stat-icon-img" />} label="Total Entities" value={(data.summary?.totalEntityOccurrences ?? 0).toLocaleString()} color="#9f7aea" sub="across all documents" />
              <StatCard icon={<img src="https://cdn-icons-png.flaticon.com/128/14035/14035711.png" alt="risk" className="an-stat-icon-img" />} label="High Risk Docs" value={(data.summary?.highRiskDocuments ?? 0).toLocaleString()} color="#e53e3e" sub="sensitivity score ≥ 60" />
              <StatCard icon={<img src="https://cdn-icons-png.flaticon.com/128/740/740845.png" alt="processing" className="an-stat-icon-img" />} label="Avg Processing" value={formatMs(data.processingTimeStats?.avg)} color="#48bb78" sub={`max ${formatMs(data.processingTimeStats?.max)}`} />
              <StatCard icon={<img src="https://cdn-icons-png.flaticon.com/128/1302/1302544.png" alt="confidence" className="an-stat-icon-img" />} label="Avg Confidence" value={`${data.summary?.avgConfidenceThreshold ?? 0}%`} color="#ed8936" />
              <StatCard icon={<img src="https://cdn-icons-png.flaticon.com/128/3756/3756712.png" alt="warning" className="an-stat-icon-img" />} label="Low Confidence Docs" value={(data.summary?.lowConfidenceDocuments ?? 0).toLocaleString()} color="#d69e2e" sub="threshold ≤ 60%" />
            </div>

            <div className="an-risk-banner">
              <div className="an-risk-item" style={{ '--c': '#48bb78' }}>
                <span className="an-risk-dot" style={{ background: '#48bb78' }} />
                <span className="an-risk-label">Low Risk</span>
                <span className="an-risk-count">{data.summary?.sensitivityBreakdown?.low ?? 0}</span>
              </div>
              <div className="an-risk-divider" />
              <div className="an-risk-item" style={{ '--c': '#ed8936' }}>
                <span className="an-risk-dot" style={{ background: '#ed8936' }} />
                <span className="an-risk-label">Medium Risk</span>
                <span className="an-risk-count">{data.summary?.sensitivityBreakdown?.medium ?? 0}</span>
              </div>
              <div className="an-risk-divider" />
              <div className="an-risk-item" style={{ '--c': '#e53e3e' }}>
                <span className="an-risk-dot" style={{ background: '#e53e3e' }} />
                <span className="an-risk-label">High Risk</span>
                <span className="an-risk-count">{data.summary?.sensitivityBreakdown?.high ?? 0}</span>
              </div>
            </div>

            <div className="an-charts-grid">
              <ChartCard title="Documents & Entities Over Time" subtitle="Daily processing volume" className="an-col-2">
                {docsOverTime.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={docsOverTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#667eea" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorEnts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#9f7aea" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#9f7aea" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a0aec0' }} tickLine={false} />
                      <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#a0aec0' }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#a0aec0' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area yAxisId="left"  type="monotone" dataKey="Documents" stroke="#667eea" fill="url(#colorDocs)" strokeWidth={2} dot={false} />
                      <Area yAxisId="right" type="monotone" dataKey="Entities"  stroke="#9f7aea" fill="url(#colorEnts)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Entity Type Distribution" subtitle="Occurrences by type">
                {entityPieData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={entityPieData}
                        cx="50%" cy="50%"
                        innerRadius={55}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {entityPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [val.toLocaleString(), name]} />
                      <Legend
                        formatter={(value) => <span style={{ fontSize: 11, color: '#4a5568' }}>{value}</span>}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Per File Type Analysis" subtitle="Avg entities and risk score">
                {fileTypeData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={fileTypeData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />

                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#a0aec0' }}
                        tickLine={false}
                      />

                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: '#a0aec0' }}
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: '#a0aec0' }}
                        tickLine={false}
                        axisLine={false}
                      />

                      <Tooltip content={<CustomTooltip />} />

                      <Legend wrapperStyle={{ fontSize: 12 }} />

                      <Bar
                        yAxisId="left"
                        dataKey="Avg Entities"
                        fill="#667eea"
                        radius={[4,4,0,0]}
                      />

                      <Bar
                        yAxisId="right"
                        dataKey="Avg Risk"
                        fill="#e53e3e"
                        radius={[4,4,0,0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Sensitivity Distribution" subtitle="Documents by risk score range">
                {sensitivityData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sensitivityData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a0aec0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#a0aec0' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Documents" radius={[4,4,0,0]}>
                        {sensitivityData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Redaction Method Usage" subtitle="How documents were redacted">
                {methodData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={methodData}
                        cx="50%" cy="50%"
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {methodData.map((_, i) => (
                          <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [val.toLocaleString(), 'Documents']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Processing Time Analysis" subtitle="Min, avg and max processing time per file type">
                {(data?.byFileType || []).length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={(data?.byFileType || []).map(f => ({
                        name:  f.fileType?.toUpperCase() || 'Unknown',
                        'Min (ms)':  f.minProcessingMs || 0,
                        'Avg (ms)':  f.avgProcessingMs,
                        'Max (ms)':  f.maxProcessingMs || 0,
                      }))}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#a0aec0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#a0aec0' }} tickLine={false} axisLine={false} tickFormatter={v => formatMs(v)} />
                      <Tooltip content={<CustomTooltip />} formatter={(val) => formatMs(val)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Max (ms)" fill="#e53e3e" radius={[4,4,0,0]} />
                      <Bar dataKey="Avg (ms)" fill="#667eea" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Processing Time Stats" subtitle="Overall system performance">
                <div className="an-proc-stats">
                  {[
                    { label: 'Average',  value: formatMs(data.processingTimeStats?.avg),    color: '#667eea', icon: 'https://cdn-icons-png.flaticon.com/128/740/740845.png' },
                    { label: 'Fastest',  value: formatMs(data.processingTimeStats?.min),    color: '#48bb78', icon: 'https://cdn-icons-png.flaticon.com/128/1067/1067357.png' },
                    { label: 'Slowest',  value: formatMs(data.processingTimeStats?.max),    color: '#e53e3e', icon: 'https://cdn-icons-png.flaticon.com/128/4922/4922498.png' },
                    { label: 'Std Dev',  value: formatMs(data.processingTimeStats?.stdDev), color: '#ed8936', icon: 'https://cdn-icons-png.flaticon.com/128/893/893201.png' },
                  ].map((s, i) => (
                    <div key={i} className="an-proc-stat-item" style={{ '--c': s.color }}>
                      <span className="an-proc-stat-icon">
                        <img src={s.icon} alt={s.label} className="an-proc-stat-icon-img" />
                      </span>
                      <span className="an-proc-stat-val" style={{ color: s.color }}>{s.value}</span>
                      <span className="an-proc-stat-label">{s.label}</span>
                    </div>
                  ))}
                  <div className="an-proc-bar-section">
                    <p className="an-proc-bar-title">Processing time breakdown</p>
                    {(data?.byFileType || []).map((f, i) => (
                      <div key={i} className="an-proc-bar-row">
                        <span className="an-proc-bar-label">{f.fileType?.toUpperCase()}</span>
                        <div className="an-proc-bar-wrap">
                          <div
                            className="an-proc-bar-fill"
                            style={{
                              width: `${Math.min(100, (f.avgProcessingMs / (data.processingTimeStats?.max || 1)) * 100)}%`,
                              background: CHART_PALETTE[i],
                            }}
                          />
                        </div>
                        <span className="an-proc-bar-val">{formatMs(f.avgProcessingMs)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>

              <ChartCard title="Confidence Score Distribution" subtitle="Entity detection confidence spread">
                {confidenceData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={confidenceData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a0aec0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#a0aec0' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Entities" fill="#667eea" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
              
              <ChartCard title="File Size vs Processing Time" subtitle="Larger files take longer — see the trend">
                {scatterData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis
                        dataKey="sizeMB"
                        name="Size"
                        type="number"
                        unit=" MB"
                        tick={{ fontSize: 11, fill: '#a0aec0' }}
                        tickLine={false}
                        label={{ value: 'File Size (MB)', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#a0aec0' }}
                      />
                      <YAxis
                        dataKey="timeS"
                        name="Time"
                        type="number"
                        unit="s"
                        tick={{ fontSize: 11, fill: '#a0aec0' }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Processing (s)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#a0aec0' }}
                      />
                      <ZAxis range={[40, 40]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div className="an-tooltip">
                              <p className="an-tooltip-label">{d?.filename}</p>
                              <p className="an-tooltip-item" style={{ color: '#667eea' }}>
                                <span>Size:</span> <strong>{d?.sizeMB} MB</strong>
                              </p>
                              <p className="an-tooltip-item" style={{ color: '#9f7aea' }}>
                                <span>Time:</span> <strong>{d?.timeS}s</strong>
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Scatter
                        data={scatterData}
                        fill="#667eea"
                        fillOpacity={0.7}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Upload Activity Heatmap" subtitle="When you upload and process documents" className="an-col-2">
                {heatmapData.rows.length === 0 ? <EmptyChart message="No upload activity yet" /> : (
                  <div className="an-heatmap-wrap">
                    <div className="an-heatmap">
                      <div className="an-heatmap-corner" />
                      {heatmapData.days.map(day => (
                        <div key={day} className="an-heatmap-day-label">{day}</div>
                      ))}
                      {heatmapData.rows.map(row => {
                        const maxVal = Math.max(...heatmapData.rows.flatMap(r =>
                          heatmapData.days.map(d => r[d] || 0)
                        ));
                        return (
                          <>
                            <div key={`label-${row.hour}`} className="an-heatmap-hour-label">{row.hour}</div>
                            {heatmapData.days.map(day => {
                              const val = row[day] || 0;
                              const intensity = maxVal > 0 ? val / maxVal : 0;
                              return (
                                <div
                                  key={`${row.hour}-${day}`}
                                  className="an-heatmap-cell"
                                  style={{
                                    background: intensity === 0
                                      ? '#f0f4f8'
                                      : `rgba(102, 126, 234, ${0.15 + intensity * 0.85})`,
                                  }}
                                  title={`${day} ${row.hour}: ${val} upload${val !== 1 ? 's' : ''}`}
                                >
                                  {/* {val > 0 && <span className="an-heatmap-val">{val}</span>} */}
                                </div>
                              );
                            })}
                          </>
                        );
                      })}
                    </div>
                    <div className="an-heatmap-legend">
                      <span className="an-heatmap-legend-label">Less</span>
                      {[0.15, 0.35, 0.55, 0.75, 1].map((o, i) => (
                        <div key={i} className="an-heatmap-legend-cell" style={{ background: `rgba(102, 126, 234, ${o})` }} />
                      ))}
                      <span className="an-heatmap-legend-label">More</span>
                    </div>
                  </div>
                )}
              </ChartCard>

              {(data?.topEntityTexts || []).length > 0 && (
                <ChartCard title="Top Detected Entity Values" subtitle="Most frequently occurring PII across documents">
                  <div className="an-top-entities">
                    {data.topEntityTexts.slice(0, 8).map((e, i) => (
                      <div key={i} className="an-top-entity-row">
                        <span className="an-top-entity-rank">#{i + 1}</span>
                        <span className="an-top-entity-text">{e.text}</span>
                        <span className="an-top-entity-count">{e.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              )}

              {(data?.entityDistribution || []).length > 0 && (
                <ChartCard title="Entity Confidence by Type" subtitle="Average detection confidence per entity type">
                  <div className="an-conf-list">
                    {data.entityDistribution.map((e, i) => (
                      <div key={i} className="an-conf-row">
                        <span className="an-conf-dot" style={{ background: ENTITY_COLORS[e.entityType] || '#667eea' }} />
                        <span className="an-conf-label">{ENTITY_LABELS[e.entityType] || e.entityType}</span>
                        <div className="an-conf-bar-wrap">
                          <div className="an-conf-bar" style={{ width: `${e.avgConfidence}%`, background: ENTITY_COLORS[e.entityType] || '#667eea' }} />
                        </div>
                        <span className="an-conf-val">{e.avgConfidence}%</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
