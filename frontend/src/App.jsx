// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: frontend/src/App.jsx                                                    ║
// ║  LAYER: ui/frontend                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
import { useState } from "react";
import {
  Activity, Cpu, Zap, Globe, Server, GitBranch, Database,
  Shield, ExternalLink, Radio, RefreshCw
} from "lucide-react";
import ActivityBar from "./components/ActivityBar";
import StatusBar from "./components/StatusBar";
import { useApi, apiPost } from "./hooks/useApi";

// ─── Shared UI Helpers ─────────────────────────────────────────────────────

function Stat({ label, value, color, small }) {
  return (
    <div className={`flex items-center justify-between ${small ? "mb-0.5" : "mb-1.5"}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${color ? `text-${color}-400` : "text-gray-300"} ${small ? "text-[10px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Loading() {
  return <p className="text-xs text-gray-600 animate-pulse">Loading...</p>;
}

function formatUptime(seconds) {
  if (!seconds) return "--";
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ─── Dashboard Panel ───────────────────────────────────────────────────────

function DashboardPanel() {
  const { data: health } = useApi("/health", { poll: 10000 });
  const { data: system } = useApi("/system/status", { poll: 15000 });

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Heady Systems Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Sacred Geometry :: Organic Systems :: Breathing Interfaces</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Health Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 hover:border-green-800/60 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold text-gray-200">System Health</h2>
          </div>
          {health ? (
            <>
              <Stat label="Status" value={health.ok ? "Healthy" : "Degraded"} color={health.ok ? "green" : "red"} />
              <Stat label="Version" value={health.version || "3.0.0"} />
              <Stat label="Uptime" value={formatUptime(health.uptime)} />
              <Stat label="Environment" value={system?.environment || "development"} />
            </>
          ) : <Loading />}
        </div>

        {/* AI Nodes Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 hover:border-cyan-800/60 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-gray-200">AI Nodes</h2>
          </div>
          {system ? (
            <>
              <Stat label="Active" value={`${system.capabilities?.nodes?.active || 0} / ${system.capabilities?.nodes?.total || 0}`} color="cyan" />
              <Stat label="Production" value={system.production_ready ? "Ready" : "Standby"} color={system.production_ready ? "green" : "yellow"} />
              <div className="mt-3 grid grid-cols-5 gap-1">
                {["JULES", "OBSERVER", "BUILDER", "ATLAS", "PYTHIA"].map(n => (
                  <div key={n} className="text-center">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mx-auto mb-1" />
                    <span className="text-[9px] text-gray-500">{n}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Loading />}
        </div>

        {/* Pipeline Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 hover:border-purple-800/60 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-gray-200">Pipeline</h2>
          </div>
          <Stat label="Stages" value="5 stages" small />
          <div className="mt-2 flex gap-1">
            {["ingest", "plan", "execute", "recover", "finalize"].map((s) => (
              <div key={s} className="flex-1 h-1.5 rounded-full bg-purple-900/50 overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: "100%" }} />
              </div>
            ))}
          </div>
          <button
            onClick={() => apiPost("/pipeline/run").then(d => alert(JSON.stringify(d, null, 2))).catch(() => {})}
            className="mt-3 w-full px-3 py-1.5 bg-purple-900/40 border border-purple-700/40 rounded-lg text-xs text-purple-300 hover:bg-purple-800/40 transition-colors"
          >
            Run Pipeline
          </button>
        </div>

        {/* Registry Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 hover:border-blue-800/60 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200">Registry</h2>
          </div>
          <Stat label="Components" value="Services, Modules, Apps" small />
          <Stat label="Workflows" value="HCFullPipeline, Sync, Checkpoint" small />
          <Stat label="Environments" value="local, cloud-me, cloud-sys" small />
          <a href="/api/registry" target="_blank" rel="noopener"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
            View Full Registry <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Security Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 hover:border-yellow-800/60 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-gray-200">Security</h2>
          </div>
          <Stat label="API Auth" value="Timing-safe HMAC" color="green" />
          <Stat label="Rate Limiting" value="Active" color="green" />
          <Stat label="Circuit Breakers" value="Enabled" color="green" />
          <button
            onClick={() => apiPost("/pipeline/claude/security").then(d => alert(JSON.stringify(d, null, 2))).catch(() => {})}
            className="mt-3 w-full px-3 py-1.5 bg-yellow-900/30 border border-yellow-700/30 rounded-lg text-xs text-yellow-300 hover:bg-yellow-800/30 transition-colors"
          >
            Run Security Audit
          </button>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 hover:border-pink-800/60 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-pink-400" />
            <h2 className="text-sm font-semibold text-gray-200">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <button onClick={() => apiPost("/system/production").then(() => alert("Production activated!")).catch(() => {})}
              className="w-full px-3 py-1.5 bg-pink-900/30 border border-pink-700/30 rounded-lg text-xs text-pink-300 hover:bg-pink-800/30 transition-colors text-left">
              Activate Production
            </button>
            <button onClick={() => apiPost("/health-checks/run").then(d => alert(JSON.stringify(d, null, 2))).catch(() => {})}
              className="w-full px-3 py-1.5 bg-green-900/30 border border-green-700/30 rounded-lg text-xs text-green-300 hover:bg-green-800/30 transition-colors text-left">
              Run Health Checks
            </button>
            <button onClick={() => apiPost("/checkpoint/analyze", { stage: "manual" }).then(d => alert(JSON.stringify(d, null, 2))).catch(() => {})}
              className="w-full px-3 py-1.5 bg-cyan-900/30 border border-cyan-700/30 rounded-lg text-xs text-cyan-300 hover:bg-cyan-800/30 transition-colors text-left">
              Checkpoint Analyze
            </button>
          </div>
        </div>
      </div>

      {/* Ecosystem Map */}
      <div className="mt-8 bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-400" />
          Heady Ecosystem
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "HeadyMe", desc: "Personal AI Platform", active: true },
            { name: "HeadySystems", desc: "Enterprise Infrastructure", active: true },
            { name: "HeadyConnection", desc: "Nonprofit & Community", active: true },
            { name: "Heady-AI", desc: "AI Research & Models", active: true },
            { name: "HeadyBuddy", desc: "AI Companion", active: true },
            { name: "HeadyAI-IDE", desc: "Custom IDE", active: false },
            { name: "HeadyBrowser", desc: "Custom Browser", active: false },
            { name: "HeadyAcademy", desc: "Learning Platform", active: false },
          ].map(item => (
            <div key={item.name} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${item.active ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
                <span className="text-xs font-medium text-gray-200">{item.name}</span>
              </div>
              <p className="text-[10px] text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Nodes Panel ───────────────────────────────────────────────────────────

function NodesPanel() {
  const nodeList = [
    { id: "JULES", role: "Builder", skills: ["code-gen", "refactoring", "architecture"], color: "cyan" },
    { id: "OBSERVER", role: "Monitor", skills: ["health-check", "anomaly-detection", "metrics"], color: "green" },
    { id: "BUILDER", role: "Constructor", skills: ["build", "deploy", "package"], color: "purple" },
    { id: "ATLAS", role: "Navigator", skills: ["search", "indexing", "knowledge-graph"], color: "blue" },
    { id: "PYTHIA", role: "Oracle", skills: ["prediction", "analysis", "recommendation"], color: "pink" },
  ];

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold text-white mb-6">AI Nodes</h1>
      <div className="space-y-3">
        {nodeList.map(node => (
          <div key={node.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full bg-${node.color}-400`} />
                <span className="text-sm font-bold text-white">{node.id}</span>
                <span className="text-xs text-gray-500">{node.role}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-800/50">Online</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {node.skills.map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700/50">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pipeline Panel ────────────────────────────────────────────────────────

function PipelinePanel() {
  const { data: state } = useApi("/pipeline/state", { poll: 5000 });
  const stages = ["ingest", "plan", "execute-major-phase", "recover", "finalize"];

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold text-white mb-6">HCFullPipeline</h1>
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Pipeline Stages</h2>
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const current = state?.currentStage === stage;
            return (
              <div key={stage} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${current ? "bg-purple-500 text-white animate-pulse" : "bg-gray-800 text-gray-500"}`}>
                  {i + 1}
                </div>
                <span className={`text-sm ${current ? "text-purple-300 font-medium" : "text-gray-400"}`}>{stage}</span>
                {current && <RefreshCw className="w-3 h-3 text-purple-400 animate-spin ml-auto" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => apiPost("/pipeline/run").catch(() => {})}
          className="flex-1 px-4 py-2 bg-purple-900/50 border border-purple-700/50 rounded-xl text-sm text-purple-300 hover:bg-purple-800/50 transition-colors">
          Run Pipeline
        </button>
        <button onClick={() => fetch("/api/pipeline/dag").then(r => r.json()).then(d => alert(JSON.stringify(d, null, 2))).catch(() => {})}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-gray-300 hover:bg-gray-700/50 transition-colors">
          View DAG
        </button>
      </div>
    </div>
  );
}

// ─── Connections Panel ─────────────────────────────────────────────────────

function ConnectionsPanel() {
  const { data: brain } = useApi("/brain/status", { poll: 10000 });

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold text-white mb-6">Connections & Services</h1>
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4" /> System Brain
        </h2>
        {brain ? (
          <>
            <Stat label="Readiness Score" value={`${brain.readinessScore || brain.ors || "--"}/100`} color="yellow" />
            <Stat label="Mode" value={brain.mode || "normal"} />
          </>
        ) : <Loading />}
      </div>
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
          <Server className="w-4 h-4" /> Services
        </h2>
        <div className="space-y-2">
          {["heady-manager", "heady-brain", "heady-conductor", "heady-render", "heady-sync"].map(svc => (
            <div key={svc} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{svc}</span>
              <span className="px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chat Panel ────────────────────────────────────────────────────────────

function ChatPanel() {
  return (
    <div className="p-6 overflow-y-auto h-full flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-pink-900/30 border border-pink-700/30 flex items-center justify-center mb-4">
        <span className="text-2xl font-bold text-pink-400">H</span>
      </div>
      <h2 className="text-lg font-bold text-white mb-2">HeadyBuddy</h2>
      <p className="text-sm text-gray-400 mb-4">AI Companion embedded in the dashboard</p>
      <p className="text-xs text-gray-500 max-w-sm">
        HeadyBuddy runs as a floating overlay on desktop (Electron) and as a service bubble on mobile.
        Use the standalone HeadyBuddy app for the full experience.
      </p>
    </div>
  );
}

// ─── Settings Panel ────────────────────────────────────────────────────────

function SettingsPanel() {
  const { data: health } = useApi("/health");
  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="space-y-4">
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">System Info</h2>
          <Stat label="Version" value={health?.version || "3.0.0"} />
          <Stat label="Node.js" value="v20+" />
          <Stat label="Port" value="3300" />
          <Stat label="API Gateway" value="heady-manager.js" />
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">API Links</h2>
          <div className="space-y-2">
            {[
              ["/api/registry", "Registry API"],
              ["/api/health", "Health Endpoint"],
              ["/api/system/status", "System Status"],
              ["/api/pipeline/state", "Pipeline State"],
              ["/api/subsystems", "All Subsystems"],
            ].map(([href, label]) => (
              <a key={href} href={href} target="_blank" rel="noopener" className="block text-xs text-blue-400 hover:text-blue-300">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panel Router ──────────────────────────────────────────────────────────

const PANELS = {
  dashboard: DashboardPanel,
  nodes: NodesPanel,
  pipeline: PipelinePanel,
  connections: ConnectionsPanel,
  chat: ChatPanel,
  settings: SettingsPanel,
};

// ─── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [activePanel, setActivePanel] = useState("dashboard");
  const Panel = PANELS[activePanel] || DashboardPanel;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      <div className="flex-1 flex overflow-hidden">
        <ActivityBar active={activePanel} onSelect={setActivePanel} />
        <main className="flex-1 overflow-hidden">
          <Panel />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
