import React, { useState, useEffect } from 'react';

export default function Memory() {
  const [status, setStatus] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [ingestText, setIngestText] = useState('');
  const [ingestMsg, setIngestMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/memory/status')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setStatus)
      .catch(e => setError(e.message));
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const r = await fetch('/api/memory/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 20 }),
      });
      const data = await r.json();
      setResults(data.results || []);
    } catch (err) {
      setResults([]);
    }
  };

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!ingestText.trim()) return;
    try {
      const r = await fetch('/api/memory/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: ingestText }),
      });
      const data = await r.json();
      setIngestMsg(data.success ? `Stored: ${data.id}` : 'Failed');
      setIngestText('');
      // Refresh status
      fetch('/api/memory/status').then(r => r.json()).then(setStatus).catch(() => {});
    } catch (err) {
      setIngestMsg('Error ingesting memory');
    }
  };

  if (error) return <div className="page"><h2>Memory</h2><p className="error">Failed to load: {error}</p></div>;
  if (!status) return <div className="page"><h2>Memory</h2><p>Loading...</p></div>;

  return (
    <div className="page">
      <h2>Memory Store</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{status.memories}</div>
          <div className="stat-label">Stored Memories</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{status.maxEntries?.toLocaleString()}</div>
          <div className="stat-label">Max Entries</div>
        </div>
      </div>

      <div className="section">
        <h3>Search</h3>
        <form onSubmit={handleSearch} className="inline-form">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search memories..." />
          <button type="submit">Search</button>
        </form>
        {results !== null && (
          <div className="results">
            {results.length === 0 ? <p>No results</p> : results.map(m => (
              <div key={m.id} className="memory-card">
                <div className="memory-content">{m.content}</div>
                <div className="agent-meta">
                  <span>{m.id.slice(0, 8)}</span>
                  <span>{new Date(m.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h3>Ingest</h3>
        <form onSubmit={handleIngest} className="inline-form">
          <textarea value={ingestText} onChange={e => setIngestText(e.target.value)} placeholder="Enter memory content..." rows={3} />
          <button type="submit">Store</button>
        </form>
        {ingestMsg && <p className="info">{ingestMsg}</p>}
      </div>
    </div>
  );
}
