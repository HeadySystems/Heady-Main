import React, { useState, useEffect } from 'react';

const STATUS_COLORS = { idle: '#4caf50', working: '#ff9800', error: '#f44336' };

export default function Agents() {
  const [agents, setAgents] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/agents/status')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setAgents)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="page"><h2>Agents</h2><p className="error">Failed to load: {error}</p></div>;
  if (!agents) return <div className="page"><h2>Agents</h2><p>Loading...</p></div>;

  const byCategory = agents.reduce((acc, a) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="page">
      <h2>Agents ({agents.length})</h2>
      {Object.entries(byCategory).map(([cat, list]) => (
        <div key={cat} className="section">
          <h3>{cat}</h3>
          <div className="agent-grid">
            {list.map(a => (
              <div key={a.id} className="agent-card">
                <div className="agent-header">
                  <span className="agent-dot" style={{ background: STATUS_COLORS[a.status] || '#999' }} />
                  <strong>{a.name}</strong>
                </div>
                <div className="agent-meta">
                  <span>{a.status}</span>
                  {a.persistent && <span className="tag">persistent</span>}
                  <span>{a.invocations} calls</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
