import React, { useState, useEffect } from 'react';

export default function Services() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/services/status')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="page"><h2>Services</h2><p className="error">Failed to load: {error}</p></div>;
  if (!data) return <div className="page"><h2>Services</h2><p>Loading...</p></div>;

  return (
    <div className="page">
      <h2>Services</h2>

      <div className="section">
        <h3>AI Providers</h3>
        <div className="service-grid">
          {(data.providers || []).map(p => (
            <div key={p.id} className="service-card">
              <div className="service-header">
                <span className="agent-dot" style={{ background: p.hasKey ? '#4caf50' : '#f44336' }} />
                <strong>{p.name}</strong>
              </div>
              <div className="service-models">{(p.models || []).join(', ')}</div>
              <div className="agent-meta">
                <span>Priority: {p.priority}</span>
                {p.hasKey ? <span className="tag">configured</span> : <span className="tag tag-warn">no key</span>}
              </div>
              {p.strengths && <div className="tag-list">{p.strengths.map(s => <span key={s} className="tag">{s}</span>)}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>Internal Services</h3>
        <div className="service-grid">
          {(data.internal || []).map(s => (
            <div key={s.id} className="service-card">
              <div className="service-header">
                <span className="agent-dot" style={{ background: s.status === 'running' ? '#4caf50' : '#f44336' }} />
                <strong>{s.id}</strong>
              </div>
              <div className="agent-meta"><span>{s.status}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
