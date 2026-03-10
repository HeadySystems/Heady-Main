import React, { useState, useEffect } from 'react';

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard/status')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="page"><h2>Dashboard</h2><p className="error">Failed to load: {error}</p></div>;
  if (!data) return <div className="page"><h2>Dashboard</h2><p>Loading...</p></div>;

  const { system, agents, memory, resources } = data;
  const memPct = resources ? Math.round((1 - resources.freeMemoryMB / resources.totalMemoryMB) * 100) : 0;

  return (
    <div className="page">
      <h2>Dashboard</h2>
      <div className="stat-grid">
        <StatCard label="Status" value={system?.status?.toUpperCase()} sub={`v${system?.version}`} />
        <StatCard label="Uptime" value={formatUptime(system?.uptime)} sub={system?.environment} />
        <StatCard label="Agents" value={agents?.total} sub={`${agents?.working || 0} active`} />
        <StatCard label="Memories" value={memory?.entries} />
        <StatCard label="CPUs" value={resources?.cpus} sub={`load: ${resources?.loadAvg?.[0]?.toFixed(2)}`} />
        <StatCard label="Memory" value={`${memPct}%`} sub={`${resources?.freeMemoryMB} MB free`} />
      </div>
      {agents?.categories && (
        <div className="section">
          <h3>Agent Categories</h3>
          <div className="tag-list">
            {agents.categories.map(c => <span key={c} className="tag">{c}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function formatUptime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}
