import React, { useState, useEffect } from 'react';
import { Code2, Database, Layers, Cpu, CheckCircle2, Terminal, Copy, Check, Server, FileCode, Shield } from 'lucide-react';
import { SQLSchema, SystemInfo } from '../types';

interface ArchitectureInspectorProps {
  systemInfo: SystemInfo | null;
}

export const ArchitectureInspector: React.FC<ArchitectureInspectorProps> = ({ systemInfo }) => {
  const [schema, setSchema] = useState<SQLSchema | null>(null);
  const [activeTab, setActiveTab] = useState<'architecture' | 'sql' | 'gorm' | 'logs'>('architecture');
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/schema')
      .then((res) => res.json())
      .then((data) => setSchema(data))
      .catch((err) => console.error('Error fetching schema:', err));

    // Simulated Logrus log entries
    setLogs([
      `[${new Date().toLocaleTimeString()}] INFO  [GoFiber] Server running on http://0.0.0.0:8080`,
      `[${new Date().toLocaleTimeString()}] INFO  [GORM] Database connected & AutoMigrate verified`,
      `[${new Date().toLocaleTimeString()}] INFO  [Logrus] Initialized JSON structured logging`,
      `[${new Date().toLocaleTimeString()}] INFO  [pgvector] HNSW Index 'idx_documents_embedding' ready (1024-d BGE-M3)`,
      `[${new Date().toLocaleTimeString()}] INFO  [DeepSeek] API Client endpoint 'https://api.deepseek.com' configured`,
    ]);
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top System Health Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Framework REST</p>
            <p className="text-sm font-bold text-slate-100">{systemInfo?.framework || 'GoFiber v2'}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">Golang {systemInfo?.go_version || 'v1.22'}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">ORM & Vector DB</p>
            <p className="text-sm font-bold text-slate-100">{systemInfo?.orm || 'GORM'} + pgvector</p>
            <p className="text-[10px] text-cyan-300 mt-0.5">BGE-M3 (1024 Dimensi)</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Logger System</p>
            <p className="text-sm font-bold text-slate-100">{systemInfo?.logger || 'Logrus'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Structured JSON Logs</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Reasoning LLM</p>
            <p className="text-sm font-bold text-slate-100">DeepSeek V4 Pro</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">API & RAG Context</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-3">
          <div className="flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Spesifikasi Arsitektur & Kode Sumber Golang</h3>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'architecture' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Diagram Arsitektur
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'sql' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              PostgreSQL DDL
            </button>
            <button
              onClick={() => setActiveTab('gorm')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'gorm' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              GORM Models (Go)
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'logs' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Logrus Terminal
            </button>
          </div>
        </div>

        {/* Tab 1: Architecture Diagram */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-cyan-400">Diagram Alur Data RAG Pipeline:</h4>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-slate-100">1. Frontend UI</div>
                  <p className="text-[10px] text-slate-400">SvelteKit / React Vite</p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-cyan-400">2. GoFiber API</div>
                  <p className="text-[10px] text-slate-400">Golang REST Router</p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-blue-400">3. Chunking</div>
                  <p className="text-[10px] text-slate-400">500-1000 Tokens</p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-indigo-400">4. BGE-M3</div>
                  <p className="text-[10px] text-slate-400">1024-d Embedding</p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-400">5. pgvector</div>
                  <p className="text-[10px] text-slate-400">HNSW Index (&lt;=&gt;)</p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-amber-400">6. DeepSeek V4</div>
                  <p className="text-[10px] text-slate-400">Context Prompt LLM</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Multi-Tenant Isolation (Tenant ID)
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Semua operasi pencarian vector dan manajemen dokumen mewajibkan klausa <code className="text-cyan-300">WHERE tenant_id = $1</code> sebelum menghitung Cosine Distance, memastikan keamanan dan isolasi data antar tenant.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  HNSW Indexing Optimization
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Penggunaan HNSW (Hierarchical Navigable Small World) dengan operator <code className="text-emerald-300">vector_cosine_ops</code> memungkinkan pencarian k-nearest neighbors (KNN) dengan query latency sub-millisecond.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SQL DDL */}
        {activeTab === 'sql' && (
          <div className="relative">
            <button
              onClick={() => copyCode(schema?.sql_ddl || '')}
              className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin SQL'}</span>
            </button>
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {schema?.sql_ddl}
            </pre>
          </div>
        )}

        {/* Tab 3: GORM Models */}
        {activeTab === 'gorm' && (
          <div className="relative">
            <button
              onClick={() => copyCode(schema?.gorm_model || '')}
              className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Go Code'}</span>
            </button>
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {schema?.gorm_model}
            </pre>
          </div>
        )}

        {/* Tab 4: Logrus Terminal Console */}
        {activeTab === 'logs' && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Logrus Structured Output (STDOUT)
              </span>
              <span className="text-emerald-400 font-bold">● Active Logging</span>
            </div>
            <div className="space-y-1.5 text-slate-300 max-h-80 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="hover:bg-slate-900/80 p-1 rounded transition text-[11px]">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
